// backend/controllers/borrowController.js
// FOCUSED ON BORROW/RETURN LOGIC WITH NEW INVENTORY MODELS
import { 
  MasterList, 
  LibraryCollection, 
  ListofBookHoldings, 
  Ebooks, 
  Borrow, 
  Student,
  Teacher,
  getInventoryModel,
  findById,
  updateItem
} from "../models/index.js";
import { sendBorrowConfirmation } from "../services/emailService.js";

// helper: normalize scanner input (handles various formats)
const normalizePhysicalId = (id) => {
  if (!id || typeof id !== "string") return id;
  
  console.log("Normalizing physical ID:", id);
  
  // For your scanner format, just clean up delimiters but keep alphanumeric
  let cleaned = id.replace(/[@\*\^\?]+/g, '').trim();
  
  console.log("Normalized to:", cleaned);
  return cleaned;
};

// Helper: Get inventory model by type
const getBorrowInventoryModel = (type) => {
  switch (type) {
    case "ListofBookHoldings":
      return ListofBookHoldings;
    case "MasterList":
      return MasterList;
    case "Ebooks":
      return Ebooks;
    case "LibraryCollection":
      return LibraryCollection;
    default:
      throw new Error(`Unknown inventory type: ${type}`);
  }
};

// Helper: Check if a book is borrowed across all inventory types (same title + author)
const checkBookBorrowedAcrossCategories = async (bookTitle, bookAuthor) => {
  console.log("🔍 Checking if book is borrowed across categories:", { bookTitle, bookAuthor });
  
  // Escape special regex characters to avoid regex errors
  const escapeRegex = (str) => {
    if (!str) return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
  
  const escapedTitle = escapeRegex(bookTitle);
  const escapedAuthor = escapeRegex(bookAuthor);
  
  // Search for all inventory items with matching title and author across all types
  const inventoryTypes = ["MasterList", "LibraryCollection", "ListofBookHoldings", "Ebooks"];
  const allMatchingItems = [];
  
  for (const type of inventoryTypes) {
    try {
      const model = getBorrowInventoryModel(type);
      let items = [];
      
      // All models use the same field names: "Book Title" and "Author"
      items = await model.find({
        "Book Title": new RegExp(`^${escapedTitle}$`, 'i'),
        "Author": new RegExp(`^${escapedAuthor}$`, 'i')
      });
      
      if (items && items.length > 0) {
        items.forEach(item => {
          allMatchingItems.push({
            _id: item._id,
            type: type,
            title: item["Book Title"],
            author: item.Author
          });
        });
      }
    } catch (error) {
      console.log(`Error searching in ${type}:`, error.message);
    }
  }
  
  console.log(`📚 Found ${allMatchingItems.length} matching items across all categories:`, allMatchingItems);
  
  // Check if any of these items are currently borrowed
  for (const item of allMatchingItems) {
    const borrowRecord = await Borrow.findOne({
      inventoryItem: item._id,
      inventoryType: item.type,
      returned: false
    });
    
    if (borrowRecord) {
      console.log(`⚠️ Book is already borrowed in ${item.type}:`, borrowRecord);
      return {
        isBorrowed: true,
        borrowedFrom: item.type,
        borrowRecord: borrowRecord
      };
    }
  }
  
  console.log("✅ Book is not borrowed in any category");
  return { isBorrowed: false };
};

// Helper: Find inventory item by various criteria
const findInventoryItem = async (query) => {
  const searchCriteria = [];
  
  // Search in ListofBookHoldings (physical books)
  if (query.title) {
    searchCriteria.push({
      model: ListofBookHoldings,
      type: "ListofBookHoldings",
      query: { booktitle: new RegExp(query.title, 'i') }
    });
  }
  if (query.author) {
    searchCriteria.push({
      model: ListofBookHoldings,
      type: "ListofBookHoldings", 
      query: { author: new RegExp(query.author, 'i') }
    });
  }
  
  // Search in MasterList
  if (query.title) {
    searchCriteria.push({
      model: MasterList,
      type: "MasterList",
      query: { "Book Title": new RegExp(query.title, 'i') }
    });
  }
  if (query.author) {
    searchCriteria.push({
      model: MasterList,
      type: "MasterList",
      query: { Author: new RegExp(query.author, 'i') }
    });
  }
  
  // Search by ID if provided
  if (query.id) {
    for (const type of ["ListofBookHoldings", "MasterList", "Ebooks"]) {
      searchCriteria.push({
        model: getBorrowInventoryModel(type),
        type: type,
        query: { _id: query.id }
      });
    }
  }
  
  // Execute searches
  for (const criteria of searchCriteria) {
    try {
      const item = await criteria.model.findOne(criteria.query);
      if (item) {
        return { item, type: criteria.type };
      }
    } catch (error) {
      console.log(`Search failed for ${criteria.type}:`, error.message);
    }
  }
  
  return null;
};

// config: loan period (days) and fine per day
const LOAN_DAYS = 7;
const FINE_PER_DAY = 10; // currency units per day

// GET all borrow records
export const getBorrowRecords = async (req, res) => {
  try {
    const records = await Borrow.find()
      .populate("student", "fullName studentNumber")
      .sort({ borrowedAt: -1 });
    
    // Populate inventory items manually since mongoose doesn't support dynamic refs
    const populatedRecords = await Promise.all(records.map(async (record) => {
      const recordObj = record.toObject();
      
      if (record.inventoryType && record.inventoryItem) {
        try {
          const typeMap = {
            'ListofBookHoldings': 'bookholdings',
            'MasterList': 'masterlist',
            'Ebooks': 'ebooks',
            'LibraryCollection': 'librarycollection'
          };
          const serviceType = typeMap[record.inventoryType] || record.inventoryType.toLowerCase();
          console.log(`🔍 Populating inventory item: ${record.inventoryItem} from ${serviceType}`);
          const inventoryItem = await findById(serviceType, record.inventoryItem);
          recordObj.inventoryItemData = inventoryItem;
          console.log(`✅ Successfully populated: ${inventoryItem?.["Book Title"] || inventoryItem?.title}`);
        } catch (error) {
          console.log("❌ Failed to populate inventory item:", error.message);
        }
      }
      
      return recordObj;
    }));
    
    res.json(populatedRecords);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// BORROW a book (supports both manual and QR with new inventory system for students and teachers)
export const borrowBook = async (req, res) => {
  try {
    const { 
      studentId, 
      studentNumber,
      teacherId,
      borrowerType,
      inventoryItemId,
      inventoryType,
      // Book search criteria
      title,
      author,
      method 
    } = req.body;
    
    console.log("📚 Borrow Request:", { 
      studentId, studentNumber, teacherId, borrowerType, inventoryItemId, inventoryType, title, author, method 
    });
    
    // Find borrower (student or teacher)
    let borrower = null;
    let actualBorrowerType = borrowerType || "student";
    
    if (teacherId || borrowerType === "teacher") {
      borrower = await Teacher.findById(teacherId);
      actualBorrowerType = "teacher";
      console.log("🎓 Looking up teacher for borrowing:", teacherId);
    } else {
      // Find student
      if (studentId) {
        borrower = await Student.findById(studentId);
      } else if (studentNumber) {
        borrower = await Student.findOne({ studentNumber: studentNumber });
      }
      actualBorrowerType = "student";
      console.log("👨‍🎓 Looking up student for borrowing:", { studentId, studentNumber });
    }
    
    if (!borrower) {
      return res.status(404).json({ 
        message: actualBorrowerType === "teacher" ? "Teacher not found" : "Student not found" 
      });
    }

    // Find inventory item
    let inventoryItem = null;
    let itemType = null;
    
    if (inventoryItemId && inventoryType) {
      // Direct inventory item lookup
      const typeMap = {
        'ListofBookHoldings': 'bookholdings',
        'MasterList': 'masterlist',
        'Ebooks': 'ebooks',
        'LibraryCollection': 'librarycollection'
      };
      const serviceType = typeMap[inventoryType] || inventoryType.toLowerCase();
      inventoryItem = await findById(serviceType, inventoryItemId);
      itemType = inventoryType;
    } else if (title || author) {
      // Search by title/author
      const result = await findInventoryItem({ title, author });
      if (result) {
        inventoryItem = result.item;
        itemType = result.type;
      }
    }
    
    if (!inventoryItem) {
      return res.status(404).json({ message: "Book/Item not found" });
    }
    
    // Check availability for physical books - Use correct field name "Volumes" (capital V)
    if (itemType === "ListofBookHoldings" && inventoryItem.Volumes <= 0) {
      return res.status(400).json({ message: "This Books is out of Copy for now, Please select a different book to borrow" });
    }
    
    // Reduce available copies for physical books - Use correct field name "Volumes" (capital V)
    if (itemType === "ListofBookHoldings" && inventoryItem.Volumes > 0) {
      await updateItem('bookholdings', inventoryItem._id, { $inc: { Volumes: -1 } });
    }

    const borrowedAt = new Date();
    const dueDate = new Date(borrowedAt);
    dueDate.setDate(dueDate.getDate() + LOAN_DAYS);

    const borrowData = {
      borrowedAt,
      dueDate,
      method: method || "manual",
      borrowerType: actualBorrowerType,
    };
    
    // Add borrower reference based on type
    if (actualBorrowerType === "teacher") {
      borrowData.teacher = borrower._id;
    } else {
      borrowData.student = borrower._id;
    }
    
    // Add inventory item reference
    borrowData.inventoryItem = inventoryItem._id;
    borrowData.inventoryType = itemType;

    const borrow = new Borrow(borrowData);
    await borrow.save();
    
    // Send email notification
    const borrowerEmail = actualBorrowerType === "teacher" 
      ? borrower.contacts?.email 
      : borrower.email;
    const borrowerName = borrower.fullName;
    
    if (borrowerEmail) {
      try {
        const bookTitle = inventoryItem["Book Title"] || inventoryItem.booktitle || inventoryItem.title || "Unknown Book";
        const bookAuthor = inventoryItem.Author || inventoryItem.author || "Unknown Author";
        
        await sendBorrowConfirmation(
          borrowerEmail,
          borrowerName,
          bookTitle,
          bookAuthor,
          dueDate
        );
        console.log(`📧 Borrow confirmation email sent to ${student.email}`);
      } catch (emailError) {
        console.error('❌ Failed to send borrow confirmation email:', emailError);
        // Don't fail the borrowing process if email fails
      }
    }
    
    // Populate the borrow record with student details
    const populated = await Borrow.findById(borrow._id)
      .populate("student", "fullName studentNumber");
    
    // Add inventory item data if applicable  
    if (populated.inventoryType && populated.inventoryItem) {
      try {
        const model = getBorrowInventoryModel(populated.inventoryType);
        const inventoryItemData = await model.findById(populated.inventoryItem);
        populated.inventoryItemData = inventoryItemData;
      } catch (error) {
        console.log("Failed to populate inventory item:", error.message);
      }
    }
      
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// RETURN a book (manual)
export const returnBook = async (req, res) => {
  try {
    const { borrowId } = req.params;
    const borrow = await Borrow.findById(borrowId);
    if (!borrow) return res.status(404).json({ message: "Borrow record not found" });
    if (borrow.returned) return res.status(400).json({ message: "Already returned" });

    const now = new Date();
    borrow.returned = true;
    borrow.returnedAt = now;

    // calculate fine
    let fine = 0;
    if (borrow.dueDate && now > borrow.dueDate) {
      const daysLate = Math.ceil((now - borrow.dueDate) / (1000 * 60 * 60 * 24));
      fine = daysLate * FINE_PER_DAY;
    }
    borrow.fineCalculated = fine;
    borrow.finePaid = 0;

    await borrow.save();

    // Restore inventory item quantity/volumes - Use correct field name "Volumes" (capital V)
    if (borrow.inventoryType && borrow.inventoryItem) {
      if (borrow.inventoryType === "ListofBookHoldings") {
        await ListofBookHoldings.findByIdAndUpdate(borrow.inventoryItem, { $inc: { Volumes: 1 } });
      }
      // MasterList, LibraryCollection, and Ebooks don't have quantity tracking typically
    }

    res.json({ message: "Book returned", borrow, fine });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DEPRECATED: Legacy QR borrowing functions removed - use new inventory system

// Activities (recent borrows/returns)
export const getBorrowActivities = async (req, res) => {
  try {
    const activities = await Borrow.find()
      .populate("student", "fullName studentNumber")
      .populate("teacher", "fullName teacherNumber")
      .sort({ updatedAt: -1 })
      .limit(50);
    
    // Populate inventory items manually
    const populatedActivities = await Promise.all(activities.map(async (activity) => {
      const activityObj = activity.toObject();
      
      if (activity.inventoryType && activity.inventoryItem) {
        try {
          const model = getBorrowInventoryModel(activity.inventoryType);
          const inventoryItem = await model.findById(activity.inventoryItem);
          activityObj.inventoryItemData = inventoryItem;
        } catch (error) {
          console.log("Failed to populate inventory item:", error.message);
        }
      }
      
      return activityObj;
    }));
    
    res.json(populatedActivities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Fine queue (all not returned or with fines)
export const getFineQueue = async (req, res) => {
  try {
    const overdue = await Borrow.find({ returned: false, dueDate: { $lt: new Date() } })
      .populate("student", "fullName studentNumber")
      .sort({ dueDate: 1 });
    
    // Populate inventory items and calculate fines
    const result = await Promise.all(overdue.map(async (b) => {
      const borrowObj = b.toObject();
      
      // Populate inventory item
      if (b.inventoryType && b.inventoryItem) {
        try {
          const model = getBorrowInventoryModel(b.inventoryType);
          const inventoryItem = await model.findById(b.inventoryItem);
          borrowObj.inventoryItemData = inventoryItem;
        } catch (error) {
          console.log("Failed to populate inventory item:", error.message);
        }
      }
      
      // Calculate fine
      const now = new Date();
      let fine = 0;
      if (b.dueDate && now > b.dueDate) {
        const daysLate = Math.ceil((now - b.dueDate) / (1000 * 60 * 60 * 24));
        fine = daysLate * FINE_PER_DAY;
      }
      
      return { borrow: borrowObj, fine };
    }));
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get student's borrowed books (by studentNumber)
export const getStudentBorrowedBooks = async (req, res) => {
  try {
    const { studentNumber } = req.params;
    const student = await Student.findOne({ studentNumber: studentNumber });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const records = await Borrow.find({ student: student._id, returned: false })
      .sort({ borrowedAt: -1 });

    // Populate inventory items manually
    const populatedRecords = await Promise.all(records.map(async (record) => {
      const recordObj = record.toObject();
      
      if (record.inventoryType && record.inventoryItem) {
        try {
          const model = getBorrowInventoryModel(record.inventoryType);
          const inventoryItem = await model.findById(record.inventoryItem);
          recordObj.inventoryItemData = inventoryItem;
        } catch (error) {
          console.log("Failed to populate inventory item:", error.message);
        }
      }
      
      return recordObj;
    }));

    res.json({ student, records: populatedRecords });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete all borrow records (dangerous)
export const deleteAllBorrowRecords = async (req, res) => {
  try {
    const result = await Borrow.deleteMany({});
    res.json({ message: `Deleted ${result.deletedCount} borrow records` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get borrower profile for QR popup (supports both students and teachers)
export const getBorrowerProfile = async (req, res) => {
  try {
    const { studentId, studentNumber, teacherId, borrowerType } = req.body;
    console.log("📋 Getting borrower profile:", { studentId, studentNumber, teacherId, borrowerType });
    
    let borrower = null;
    let actualBorrowerType = borrowerType;
    
    if (teacherId || borrowerType === "teacher") {
      // Teacher lookup
      borrower = await Teacher.findById(teacherId);
      actualBorrowerType = "teacher";
      console.log("🎓 Looking up teacher:", teacherId);
    } else {
      // Student lookup
      if (studentId) {
        borrower = await Student.findById(studentId);
      } else if (studentNumber) {
        borrower = await Student.findOne({ studentNumber });
      }
      actualBorrowerType = "student";
      console.log("👨‍🎓 Looking up student:", { studentId, studentNumber });
    }
    
    if (!borrower) {
      return res.status(404).json({ 
        message: actualBorrowerType === "teacher" ? "Teacher not found" : "Student not found" 
      });
    }

    // Get all borrowed books (not returned)
    const borrowQuery = actualBorrowerType === "teacher" 
      ? { teacher: borrower._id, returned: false }
      : { student: borrower._id, returned: false };
    
    const borrowedBooks = await Borrow.find(borrowQuery);
    
    console.log("📚 Found borrowed books:", borrowedBooks.length);
    console.log("📚 Borrowed books details:", borrowedBooks.map(b => ({
      id: b._id,
      inventoryItem: b.inventoryItem,
      inventoryType: b.inventoryType,
      returned: b.returned
    })));

    // Calculate fines and populate inventory items
    const now = new Date();
    let totalFine = 0;
    const borrowsWithFines = await Promise.all(borrowedBooks.map(async (borrow) => {
      const borrowObj = borrow.toObject();
      
      // Populate inventory item
      if (borrow.inventoryType && borrow.inventoryItem) {
        try {
          const model = getBorrowInventoryModel(borrow.inventoryType);
          const inventoryItem = await model.findById(borrow.inventoryItem);
          borrowObj.inventoryItemData = inventoryItem;
        } catch (error) {
          console.log("Failed to populate inventory item:", error.message);
        }
      }
      
      // Calculate fine
      let fine = 0;
      if (borrow.dueDate && now > borrow.dueDate) {
        const daysLate = Math.ceil((now - borrow.dueDate) / (1000 * 60 * 60 * 24));
        fine = daysLate * FINE_PER_DAY;
      }
      totalFine += fine;
      
      return {
        ...borrowObj,
        fine
      };
    }));

    // Return response based on borrower type
    if (actualBorrowerType === "teacher") {
      res.json({
        teacher: borrower,
        borrowedBooks: borrowsWithFines,
        totalFine,
        borrowerType: "teacher"
      });
    } else {
      res.json({
        student: borrower,
        borrowedBooks: borrowsWithFines,
        totalFine,
        borrowerType: "student"
      });
    }
  } catch (err) {
    console.error("Error getting student profile:", err);
    res.status(500).json({ message: err.message });
  }
};

// Borrow or Return inventory item via QR popup (supports both students and teachers)
export const borrowReturnBookByQR = async (req, res) => {
  try {
    let { studentId, teacherId, borrowerType, inventoryItemId, inventoryType, action, bookId } = req.body;
    console.log("📚 QR Action (Raw):", { studentId, teacherId, borrowerType, inventoryItemId, inventoryType, action, bookId });
    
    // Handle both new inventory format and legacy bookId format
    if (!inventoryItemId && bookId) {
      // Try to parse bookId as JSON (new QR format)
      try {
        const qrData = JSON.parse(bookId);
        if (qrData.type === "inventory") {
          inventoryItemId = qrData.inventoryItemId;
          inventoryType = qrData.inventoryType;
          console.log("✅ Parsed QR inventory data:", { inventoryItemId, inventoryType });
        } else if (qrData.type === "book") {
          // Legacy book QR format - need to find in inventory
          console.log("⚠️  Legacy book QR format detected, searching in inventory...");
          const result = await findInventoryItem({ 
            title: qrData.name, 
            author: qrData.author 
          });
          if (result) {
            inventoryItemId = result.item._id;
            inventoryType = result.type;
            console.log("✅ Found in inventory:", { inventoryItemId, inventoryType });
          }
        }
      } catch (e) {
        // bookId is not JSON, treat as direct inventory item ID
        inventoryItemId = bookId;
        // Default to ListofBookHoldings if type not specified
        inventoryType = inventoryType || "ListofBookHoldings";
        console.log("📖 Using direct ID format:", { inventoryItemId, inventoryType });
      }
    }
    
    console.log("📚 QR Inventory Action (Processed):", { studentId, teacherId, borrowerType, inventoryItemId, inventoryType, action });
    
    // Determine borrower type and validate required fields
    const actualBorrowerType = borrowerType || (teacherId ? "teacher" : "student");
    const borrowerId = teacherId || studentId;
    
    if (!borrowerId || !inventoryItemId || !inventoryType || !action) {
      return res.status(400).json({ message: "borrowerId, inventoryItemId, inventoryType, and action are required" });
    }

    // Find borrower (student or teacher)
    let borrower = null;
    if (actualBorrowerType === "teacher") {
      borrower = await Teacher.findById(borrowerId);
      if (!borrower) {
        return res.status(404).json({ message: "Teacher not found" });
      }
    } else {
      borrower = await Student.findById(borrowerId);
      if (!borrower) {
        return res.status(404).json({ message: "Student not found" });
      }
    }

    // Find inventory item
    let inventoryItem = null;
    try {
      const model = getBorrowInventoryModel(inventoryType);
      inventoryItem = await model.findById(inventoryItemId);
    } catch (error) {
      return res.status(400).json({ message: `Invalid inventory type: ${inventoryType}` });
    }

    if (!inventoryItem) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    console.log("Found inventory item:", { 
      id: inventoryItem._id, 
      type: inventoryType, 
      title: inventoryItem.booktitle || inventoryItem["Book Title"] || "Unknown Title",
      fullItem: inventoryItem
    });

    if (action === "borrow") {
      // Check if borrower already borrowed this inventory item
      const borrowQuery = actualBorrowerType === "teacher"
        ? { teacher: borrower._id, inventoryItem: inventoryItem._id, inventoryType: inventoryType, returned: false }
        : { student: borrower._id, inventoryItem: inventoryItem._id, inventoryType: inventoryType, returned: false };
      
      const existingBorrow = await Borrow.findOne(borrowQuery);
      
      if (existingBorrow) {
        const itemTitle = inventoryItem["Book Title"] || inventoryItem.title || inventoryItem.name || "Unknown Item";
        return res.status(409).json({ 
          message: "This Book is already borrowed, Please select another book",
          type: "duplicate_borrow",
          bookName: itemTitle,
          borrowerName: borrower.fullName,
          borrowerType: actualBorrowerType
        });
      }

      // Check if the book is already borrowed by anyone (1 copy limitation for ALL book types)
      const bookAlreadyBorrowed = await Borrow.findOne({
        inventoryItem: inventoryItem._id,
        inventoryType: inventoryType,
        returned: false
      });
      
      if (bookAlreadyBorrowed) {
        const bookTitle = inventoryItem["Book Title"] || inventoryItem.booktitle || inventoryItem.title || "Unknown Book";
        return res.status(400).json({ 
          message: "This book is currently borrowed by someone else. Please select a different book or wait for it to be returned.",
          bookName: bookTitle,
          type: "out_of_stock"
        });
      }

      // 🔒 NEW: Cross-category borrowing protection
      // Check if the same book (by title + author) is borrowed in ANY other category
      const bookTitle = inventoryItem["Book Title"] || inventoryItem.title || inventoryItem.name || "Unknown Book";
      const bookAuthor = inventoryItem.Author || inventoryItem.author || "Unknown Author";
      
      const crossCategoryCheck = await checkBookBorrowedAcrossCategories(bookTitle, bookAuthor);
      
      if (crossCategoryCheck.isBorrowed) {
        console.log(`⚠️ Cross-category borrow prevention: Book "${bookTitle}" is already borrowed from ${crossCategoryCheck.borrowedFrom}`);
        return res.status(400).json({ 
          message: `⚠️ This book is currently borrowed from another category (${crossCategoryCheck.borrowedFrom}). The same physical book exists in multiple categories and can only be borrowed once at a time. Please select a different book or wait for it to be returned.`,
          bookName: bookTitle,
          borrowedFrom: crossCategoryCheck.borrowedFrom,
          currentCategory: inventoryType,
          type: "cross_category_borrowed"
        });
      }

      // Create borrow record
      const borrowedAt = new Date();
      const dueDate = new Date(borrowedAt);
      dueDate.setDate(dueDate.getDate() + LOAN_DAYS);

      const borrowData = {
        inventoryItem: inventoryItem._id,
        inventoryType: inventoryType,
        borrowedAt,
        dueDate,
        method: "qr",
        borrowerType: actualBorrowerType,
      };
      
      // Add borrower reference based on type
      if (actualBorrowerType === "teacher") {
        borrowData.teacher = borrower._id;
      } else {
        borrowData.student = borrower._id;
      }
      
      const borrow = new Borrow(borrowData);

      await borrow.save();
      console.log("✅ Borrow record saved:", {
        borrowId: borrow._id,
        studentId: borrow.student,
        inventoryItem: borrow.inventoryItem,
        inventoryType: borrow.inventoryType,
        returned: borrow.returned
      });
      
      // Send email notification for QR borrowing
      const borrowerEmail = borrower.contacts?.email || borrower.email;
      if (borrowerEmail) {
        try {
          const bookTitle = inventoryItem["Book Title"] || inventoryItem.booktitle || inventoryItem.title || "Unknown Book";
          const bookAuthor = inventoryItem.Author || inventoryItem.author || "Unknown Author";
          
          await sendBorrowConfirmation(
            borrowerEmail,
            borrower.fullName,
            bookTitle,
            bookAuthor,
            dueDate
          );
          console.log(`📧 QR Borrow confirmation email sent to ${borrowerEmail}`);
        } catch (emailError) {
          console.error('❌ Failed to send QR borrow confirmation email:', emailError);
          // Don't fail the borrowing process if email fails
        }
      }

      // No volume decrement needed - each book is limited to 1 borrower at a time

      // Populate the response based on borrower type
      let populated;
      if (actualBorrowerType === "teacher") {
        populated = await Borrow.findById(borrow._id)
          .populate("teacher", "fullName teachingLevel");
      } else {
        populated = await Borrow.findById(borrow._id)
          .populate("student", "fullName studentNumber");
      }
      
      const responseObj = populated.toObject();
      responseObj.inventoryItemData = inventoryItem;

      res.status(201).json({ message: "Item borrowed successfully", borrow: responseObj });

    } else if (action === "return") {
      // Find the active borrow record for this borrower and inventory item
      const returnQuery = actualBorrowerType === "teacher"
        ? { teacher: borrower._id, inventoryItem: inventoryItem._id, inventoryType: inventoryType, returned: false }
        : { student: borrower._id, inventoryItem: inventoryItem._id, inventoryType: inventoryType, returned: false };
      
      const borrow = await Borrow.findOne(returnQuery);

      if (!borrow) {
        return res.status(404).json({ 
          message: "Active borrow record not found for this item" 
        });
      }

      // Return the item
      const now = new Date();
      borrow.returned = true;
      borrow.returnedAt = now;

      // Calculate fine
      let fine = 0;
      if (borrow.dueDate && now > borrow.dueDate) {
        const daysLate = Math.ceil((now - borrow.dueDate) / (1000 * 60 * 60 * 24));
        fine = daysLate * FINE_PER_DAY;
      }
      borrow.fineCalculated = fine;
      borrow.finePaid = 0;

      await borrow.save();

      // No volume increment needed - availability is tracked by borrow records only

      const responseObj = borrow.toObject();
      responseObj.inventoryItemData = inventoryItem;

      res.json({ message: "Item returned successfully", borrow: responseObj, fine });
    } else {
      res.status(400).json({ message: "Invalid action. Use 'borrow' or 'return'" });
    }
  } catch (err) {
    console.error("Error in borrowReturnBookByQR:", err);
    res.status(500).json({ message: err.message });
  }
};

// Pay student fine
export const payStudentFine = async (req, res) => {
  try {
    const { studentId } = req.body;
    console.log("💰 Paying fine for student:", studentId);
    
    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Mark all unpaid fines as paid
    await Borrow.updateMany(
      { 
        student: student._id, 
        fineCalculated: { $gt: 0 },
        finePaid: { $lt: "$fineCalculated" }
      },
      { $set: { finePaid: "$fineCalculated" } }
    );

    res.json({ message: "All fines marked as paid" });
  } catch (err) {
    console.error("Error paying fine:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get borrowed books count (for dashboard)
export const getBorrowedCount = async (req, res) => {
  try {
    const count = await Borrow.countDocuments({ returned: false });
    res.json({ count });
  } catch (err) {
    console.error("Error getting borrowed count:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get borrowed books list (for borrowed books report)
export const getBorrowedList = async (req, res) => {
  try {
    const borrows = await Borrow.find({ returned: false })
      .populate("student", "fullName yearOrGrade")
      .populate("teacher", "fullName teachingLevel")
      .populate("inventoryItem")
      .sort({ borrowedAt: -1 });

    // Format the response to include book details
    const formattedList = borrows.map(borrow => {
      const borrowerName = borrow.borrowerType === "teacher" 
        ? borrow.teacher?.fullName 
        : borrow.student?.fullName;
      
      const borrowerLevel = borrow.borrowerType === "teacher"
        ? borrow.teacher?.teachingLevel
        : borrow.student?.yearOrGrade;

      // Get book title from inventory item
      let bookTitle = "Unknown Book";
      if (borrow.inventoryItem) {
        bookTitle = borrow.inventoryItem["Book Title"] || 
                   borrow.inventoryItem.booktitle || 
                   borrow.inventoryItem.title || 
                   "Unknown Book";
      }

      return {
        _id: borrow._id,
        bookTitle,
        studentName: borrowerName,
        borrowerName,
        yearOrGrade: borrowerLevel,
        borrowerLevel,
        borrowerType: borrow.borrowerType,
        dateBorrowed: borrow.borrowedAt,
        borrowedAt: borrow.borrowedAt,
        dueDate: borrow.dueDate,
        inventoryType: borrow.inventoryType,
        inventoryItemData: borrow.inventoryItem
      };
    });

    res.json(formattedList);
  } catch (err) {
    console.error("Error getting borrowed list:", err);
    res.status(500).json({ message: err.message });
  }
};
