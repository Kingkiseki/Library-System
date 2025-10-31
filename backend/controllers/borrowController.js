// backend/controllers/borrowController.js
import Borrow from "../models/Borrow.js";
import Student from "../models/Student.js";
import ListofBookHoldings from "../models/ListofBookHoldings.js";
import MasterList from "../models/MasterList.js";
import Ebooks from "../models/Ebooks.js";
import LibraryCollection from "../models/LIbraryCollection.js";

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
const getInventoryModel = (type) => {
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
        model: getInventoryModel(type),
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
          const model = getInventoryModel(record.inventoryType);
          const inventoryItem = await model.findById(record.inventoryItem);
          recordObj.inventoryItemData = inventoryItem;
        } catch (error) {
          console.log("Failed to populate inventory item:", error.message);
        }
      }
      
      return recordObj;
    }));
    
    res.json(populatedRecords);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// BORROW a book (supports both manual and QR with new inventory system)
export const borrowBook = async (req, res) => {
  try {
    const { 
      studentId, 
      studentNumber, 
      inventoryItemId,
      inventoryType,
      // Book search criteria
      title,
      author,
      method 
    } = req.body;
    
    console.log("📚 Borrow Request:", { 
      studentId, studentNumber, inventoryItemId, inventoryType, title, author, method 
    });
    
    // Find student
    let student = null;
    if (studentId) {
      student = await Student.findById(studentId);
    } else if (studentNumber) {
      student = await Student.findOne({ studentNumber: studentNumber });
    }
    
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Find inventory item
    let inventoryItem = null;
    let itemType = null;
    
    if (inventoryItemId && inventoryType) {
      // Direct inventory item lookup
      const model = getInventoryModel(inventoryType);
      inventoryItem = await model.findById(inventoryItemId);
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
    
    // Check availability for physical books
    if (itemType === "ListofBookHoldings" && inventoryItem.volumes <= 0) {
      return res.status(400).json({ message: "No copies available" });
    }
    
    // Reduce available copies for physical books
    if (itemType === "ListofBookHoldings" && inventoryItem.volumes > 0) {
      await ListofBookHoldings.findByIdAndUpdate(inventoryItem._id, { $inc: { volumes: -1 } });
    }

    const borrowedAt = new Date();
    const dueDate = new Date(borrowedAt);
    dueDate.setDate(dueDate.getDate() + LOAN_DAYS);

    const borrowData = {
      student: student._id,
      borrowedAt,
      dueDate,
      method: method || "manual",
    };
    
    // Add inventory item reference
    borrowData.inventoryItem = inventoryItem._id;
    borrowData.inventoryType = itemType;

    const borrow = new Borrow(borrowData);
    await borrow.save();
    
    // Populate the borrow record with student details
    const populated = await Borrow.findById(borrow._id)
      .populate("student", "fullName studentNumber");
    
    // Add inventory item data if applicable  
    if (populated.inventoryType && populated.inventoryItem) {
      try {
        const model = getInventoryModel(populated.inventoryType);
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

    // Restore inventory item quantity/volumes
    if (borrow.inventoryType && borrow.inventoryItem) {
      if (borrow.inventoryType === "ListofBookHoldings") {
        await ListofBookHoldings.findByIdAndUpdate(borrow.inventoryItem, { $inc: { volumes: 1 } });
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
      .sort({ updatedAt: -1 })
      .limit(50);
    
    // Populate inventory items manually
    const populatedActivities = await Promise.all(activities.map(async (activity) => {
      const activityObj = activity.toObject();
      
      if (activity.inventoryType && activity.inventoryItem) {
        try {
          const model = getInventoryModel(activity.inventoryType);
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
          const model = getInventoryModel(b.inventoryType);
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
          const model = getInventoryModel(record.inventoryType);
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

// Get student profile for QR popup (supports both studentId and studentNumber)
export const getStudentBorrowProfile = async (req, res) => {
  try {
    const { studentId, studentNumber } = req.body;
    console.log("📋 Getting student profile:", { studentId, studentNumber });
    
    let student = null;
    if (studentId) {
      // Try by MongoDB ObjectId first
      student = await Student.findById(studentId);
    }
    if (!student && studentNumber) {
      // Fallback to studentNumber
      student = await Student.findOne({ studentNumber });
    }
    
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get all borrowed books (not returned)
    const borrowedBooks = await Borrow.find({ 
      student: student._id, 
      returned: false 
    });

    // Calculate fines and populate inventory items
    const now = new Date();
    let totalFine = 0;
    const borrowsWithFines = await Promise.all(borrowedBooks.map(async (borrow) => {
      const borrowObj = borrow.toObject();
      
      // Populate inventory item
      if (borrow.inventoryType && borrow.inventoryItem) {
        try {
          const model = getInventoryModel(borrow.inventoryType);
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

    res.json({
      student,
      borrowedBooks: borrowsWithFines,
      totalFine
    });
  } catch (err) {
    console.error("Error getting student profile:", err);
    res.status(500).json({ message: err.message });
  }
};

// Borrow or Return inventory item via QR popup
export const borrowReturnBookByQR = async (req, res) => {
  try {
    let { studentId, inventoryItemId, inventoryType, action, bookId } = req.body;
    console.log("📚 QR Action (Raw):", { studentId, inventoryItemId, inventoryType, action, bookId });
    
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
    
    console.log("📚 QR Inventory Action (Processed):", { studentId, inventoryItemId, inventoryType, action });
    
    if (!studentId || !inventoryItemId || !inventoryType || !action) {
      return res.status(400).json({ message: "studentId, inventoryItemId, inventoryType, and action are required" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Find inventory item
    let inventoryItem = null;
    try {
      const model = getInventoryModel(inventoryType);
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
      title: inventoryItem.booktitle || inventoryItem["Book Title"] || "Unknown Title"
    });

    if (action === "borrow") {
      // Check if student already borrowed this inventory item
      const existingBorrow = await Borrow.findOne({
        student: student._id,
        inventoryItem: inventoryItem._id,
        inventoryType: inventoryType,
        returned: false
      });
      
      if (existingBorrow) {
        const itemTitle = inventoryItem.booktitle || inventoryItem["Book Title"] || "Unknown Item";
        return res.status(409).json({ 
          message: "You already have this item borrowed",
          type: "duplicate_borrow",
          itemName: itemTitle,
          studentName: student.fullName
        });
      }

      // Check availability for physical books (ListofBookHoldings)
      if (inventoryType === "ListofBookHoldings") {
        if (!inventoryItem.volumes || inventoryItem.volumes <= 0) {
          return res.status(400).json({ 
            message: "This item has no available copies for borrowing",
            itemName: inventoryItem.booktitle,
            availableCopies: 0
          });
        }
      }

      // Create borrow record
      const borrowedAt = new Date();
      const dueDate = new Date(borrowedAt);
      dueDate.setDate(dueDate.getDate() + LOAN_DAYS);

      const borrow = new Borrow({
        student: student._id,
        inventoryItem: inventoryItem._id,
        inventoryType: inventoryType,
        borrowedAt,
        dueDate,
        method: "qr",
      });

      await borrow.save();

      // Reduce available copies for physical books
      if (inventoryType === "ListofBookHoldings" && inventoryItem.volumes > 0) {
        await ListofBookHoldings.findByIdAndUpdate(inventoryItem._id, { $inc: { volumes: -1 } });
        console.log(`📊 Reduced volumes for "${inventoryItem.booktitle}" by 1`);
      }

      // Populate the response
      const populated = await Borrow.findById(borrow._id)
        .populate("student", "fullName studentNumber");
      
      const responseObj = populated.toObject();
      responseObj.inventoryItemData = inventoryItem;

      res.status(201).json({ message: "Item borrowed successfully", borrow: responseObj });

    } else if (action === "return") {
      // Find the active borrow record for this student and inventory item
      const borrow = await Borrow.findOne({
        student: student._id,
        inventoryItem: inventoryItem._id,
        inventoryType: inventoryType,
        returned: false
      });

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

      // Restore inventory item quantity/volumes
      if (inventoryType === "ListofBookHoldings") {
        await ListofBookHoldings.findByIdAndUpdate(inventoryItem._id, { $inc: { volumes: 1 } });
        console.log(`📊 Restored volumes for "${inventoryItem.booktitle}" by 1`);
      }

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
