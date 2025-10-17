// backend/controllers/borrowController.js
import Borrow from "../models/Borrow.js";
import Book from "../models/Book.js";
import Student from "../models/Student.js";

// helper: normalize scanner input (handles various formats)
const normalizePhysicalId = (id) => {
  if (!id || typeof id !== "string") return id;
  
  console.log("Normalizing physical ID:", id);
  
  // For your scanner format, just clean up delimiters but keep alphanumeric
  let cleaned = id.replace(/[@\*\^\?]+/g, '').trim();
  
  console.log("Normalized to:", cleaned);
  return cleaned;
};

// config: loan period (days) and fine per day
const LOAN_DAYS = 7;
const FINE_PER_DAY = 10; // currency units per day

// GET all borrow records
export const getBorrowRecords = async (req, res) => {
  try {
    const records = await Borrow.find()
      .populate("student", "name studentNumber")
      .populate("book", "title author isbn")
      .sort({ borrowedAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// BORROW a book (supports both manual and QR)
export const borrowBook = async (req, res) => {
  try {
    const { studentId, bookId, studentNumber, physicalId, method } = req.body;
    console.log("📚 Borrow Request:", { studentId, bookId, studentNumber, physicalId, method });
    
    // Support both manual (studentId, bookId) and QR (studentNumber, physicalId) modes
    let student = null;
    let book = null;
    
    if (studentId) {
      // Manual mode: look up by MongoDB ObjectId
      student = await Student.findById(studentId);
    } else if (studentNumber) {
      // QR mode: look up by studentNumber
      student = await Student.findOne({ studentNumber: studentNumber });
    }
    
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (bookId) {
      // Manual mode: look up by MongoDB ObjectId
      book = await Book.findById(bookId);
    } else if (physicalId) {
      // QR mode: look up by physicalId
      const normalizedId = normalizePhysicalId(physicalId);
      console.log(`🔍 Looking for book with Physical ID:`);
      console.log(`   Original: "${physicalId}"`);
      console.log(`   Normalized: "${normalizedId}"`);
      
      // Debug: show all books with Physical IDs
      const allBooks = await Book.find({ physicalId: { $exists: true } }, 'name physicalId').lean();
      console.log(`📚 All books with Physical IDs:`, allBooks.map(b => ({
        name: b.name,
        physicalId: b.physicalId,
        normalized: normalizePhysicalId(b.physicalId)
      })));
      
      book = await Book.findOne({ physicalId: normalizedId });
    }
    
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.quantity !== undefined && book.quantity <= 0) return res.status(400).json({ message: "No copies available" });

    // reduce book qty if field exists (use atomic update)
    if (book.quantity !== undefined) {
      await Book.findByIdAndUpdate(book._id, { $inc: { quantity: -1 } });
    }

    const borrowedAt = new Date();
    const dueDate = new Date(borrowedAt);
    dueDate.setDate(dueDate.getDate() + LOAN_DAYS);

    const borrow = new Borrow({
      student: student._id,
      book: book._id,
      borrowedAt,
      dueDate,
      method: method || "manual",
    });

    await borrow.save();
    
    // Populate the borrow record with student and book details
    const populated = await Borrow.findById(borrow._id)
      .populate("student", "fullName studentNumber")
      .populate("book", "name author isbn physicalId");
      
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// RETURN a book (manual)
export const returnBook = async (req, res) => {
  try {
    const { borrowId } = req.params;
    const borrow = await Borrow.findById(borrowId).populate("book");
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

    // increment book quantity
    if (borrow.book && borrow.book._id) {
      // assume Book has 'quantity' field
      await Book.findByIdAndUpdate(borrow.book._id, { $inc: { quantity: 1 } });
    }

    res.json({ message: "Book returned", borrow, fine });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Borrow by scanning QR (supports both ISBN and Physical ID)
export const borrowBookByQR = async (req, res) => {
  try {
    const { studentNumber, isbn, physicalId } = req.body;
    const bookIdentifier = physicalId || isbn; // Use physicalId if provided, fallback to isbn
    
    if (!studentNumber || !bookIdentifier) return res.status(400).json({ message: "studentNumber and book identifier (ISBN or physicalId) required" });

    const student = await Student.findOne({ studentNumber: studentNumber });
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Try to find book by physicalId first, then by ISBN
    let book = null;
    if (physicalId) {
      book = await Book.findOne({ physicalId: normalizePhysicalId(physicalId) });
    }
    if (!book && isbn) {
      book = await Book.findOne({ isbn });
    }
    
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.quantity !== undefined && book.quantity <= 0) return res.status(400).json({ message: "No copies available" });

    if (book.quantity !== undefined) {
      await Book.findByIdAndUpdate(book._id, { $inc: { quantity: -1 } });
    }

    const borrowedAt = new Date();
    const dueDate = new Date(borrowedAt);
    dueDate.setDate(dueDate.getDate() + LOAN_DAYS);

    const borrow = new Borrow({
      student: student._id,
      book: book._id,
      borrowedAt,
      dueDate,
      method: "qr",
    });

    await borrow.save();
    const populated = await borrow.populate("student", "name studentNumber").populate("book", "title isbn");
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Return by QR (e.g., by scanning borrow id or student+isbn)
export const returnBookByQR = async (req, res) => {
  try {
    const { borrowId, studentNumber, isbn } = req.body;
    let borrow = null;

    if (borrowId) {
      borrow = await Borrow.findById(borrowId).populate("book");
    } else if (studentNumber && isbn) {
      const student = await Student.findOne({ studentNumber: studentNumber });
      const book = await Book.findOne({ isbn });
      if (!student || !book) return res.status(404).json({ message: "Student or book not found" });
      borrow = await Borrow.findOne({ student: student._id, book: book._id, returned: false });
    }

    if (!borrow) return res.status(404).json({ message: "Active borrow record not found" });

    const now = new Date();
    borrow.returned = true;
    borrow.returnedAt = now;

    let fine = 0;
    if (borrow.dueDate && now > borrow.dueDate) {
      const daysLate = Math.ceil((now - borrow.dueDate) / (1000 * 60 * 60 * 24));
      fine = daysLate * FINE_PER_DAY;
    }
    borrow.fineCalculated = fine;
    borrow.finePaid = 0;

    await borrow.save();

    if (borrow.book && borrow.book._id) {
      await Book.findByIdAndUpdate(borrow.book._id, { $inc: { quantity: 1 } });
    }

    res.json({ message: "Book returned (QR)", borrow, fine });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Activities (recent borrows/returns)
export const getBorrowActivities = async (req, res) => {
  try {
    const activities = await Borrow.find()
      .populate("student", "name studentNumber")
      .populate("book", "title")
      .sort({ updatedAt: -1 })
      .limit(50);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Fine queue (all not returned or with fines)
export const getFineQueue = async (req, res) => {
  try {
    const overdue = await Borrow.find({ returned: false, dueDate: { $lt: new Date() } })
      .populate("student", "name studentNumber")
      .populate("book", "title")
      .sort({ dueDate: 1 });
    // attach calculated fine
    const result = overdue.map(b => {
      const now = new Date();
      let fine = 0;
      if (b.dueDate && now > b.dueDate) {
        const daysLate = Math.ceil((now - b.dueDate) / (1000 * 60 * 60 * 24));
        fine = daysLate * FINE_PER_DAY;
      }
      return { borrow: b, fine };
    });
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
      .populate("book", "title author isbn")
      .sort({ borrowedAt: -1 });

    res.json({ student, records });
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
    }).populate("book", "name author isbn physicalId bookNumber");

    // Calculate fines for each borrowed book
    const now = new Date();
    let totalFine = 0;
    const borrowsWithFines = borrowedBooks.map(borrow => {
      let fine = 0;
      if (borrow.dueDate && now > borrow.dueDate) {
        const daysLate = Math.ceil((now - borrow.dueDate) / (1000 * 60 * 60 * 24));
        fine = daysLate * FINE_PER_DAY;
      }
      totalFine += fine;
      return {
        ...borrow.toObject(),
        fine
      };
    });

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

// Borrow or Return book via QR popup
export const borrowReturnBookByQR = async (req, res) => {
  try {
    const { studentId, bookId, action, bookData } = req.body;
    console.log("📚 QR Book Action:", { studentId, bookId, action, bookData });
    
    // NEW: Handle JSON book data from factory-reset scanner
    let actualBookId = bookId;
    let bookInfo = null;
    
    // Try to parse bookId as JSON first (new clean scanner format)
    try {
      const parsedBookData = JSON.parse(bookId);
      if (parsedBookData.type === "book") {
        console.log("✅ Parsed JSON book data:", parsedBookData);
        actualBookId = parsedBookData.bookId;
        bookInfo = {
          name: parsedBookData.name,
          isbn: parsedBookData.isbn,
          author: parsedBookData.author
        };
        console.log("📖 Using book ID from JSON:", actualBookId);
      }
    } catch (e) {
      console.log("📖 Not JSON format, using direct bookId:", bookId);
      // Continue with legacy handling
    }
    
    // Debug the bookId value in detail
    console.log("🔍 BACKEND BOOK ID DEBUG:");
    console.log("  Raw value:", JSON.stringify(actualBookId));
    console.log("  Type:", typeof actualBookId);
    console.log("  Length:", actualBookId?.length);
    console.log("  Book info from JSON:", bookInfo);
    
    if (!studentId || !actualBookId || !action) {
      return res.status(400).json({ message: "studentId, bookId, and action are required" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    let book = null;
    
    // Try to find book by different possible ID formats
    // First try by MongoDB ObjectId (new JSON format uses ObjectId)
    if (actualBookId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log("🔍 Trying to find book by MongoDB ObjectId:", actualBookId);
      book = await Book.findById(actualBookId);
      console.log("✅ Book lookup by ObjectId:", book ? "Found" : "Not found");
    }
    
    // If not found, try by physicalId (legacy format)
    if (!book) {
      const normalizedBookId = normalizePhysicalId(actualBookId);
      console.log("🔍 Trying to find book by physicalId:", normalizedBookId);
      console.log("🔍 Original bookId:", actualBookId);
      console.log("🔍 Normalized bookId:", normalizedBookId);
      
      try {
        book = await Book.findOne({ physicalId: normalizedBookId });
        console.log("✅ Book lookup by physicalId successful:", book ? "Found" : "Not found");
      } catch (error) {
        console.error("❌ Error in physicalId lookup:", error);
      }
    }
    
    if (!book) {
      // Try by bookNumber
      console.log("Trying to find book by bookNumber:", actualBookId);
      book = await Book.findOne({ bookNumber: actualBookId });
      console.log("Book lookup by bookNumber:", book ? "Found" : "Not found");
    }
    
    if (!book) {
      // Try by ISBN
      console.log("Trying to find book by ISBN:", actualBookId);
      book = await Book.findOne({ isbn: actualBookId });
      console.log("Book lookup by ISBN:", book ? "Found" : "Not found");
    }
    
    // Try by name (partial match for flexibility) - use bookInfo if available
    if (!book) {
      const searchName = bookInfo?.name || actualBookId;
      console.log("Trying to find book by name containing:", searchName);
      book = await Book.findOne({ name: new RegExp(searchName, 'i') });
      console.log("Book lookup by name:", book ? "Found" : "Not found");
    }
    
    // If still no book found, only look for books without physicalId (don't reassign existing ones)
    if (!book) {
      console.log("🔄 No book found with any method. Looking for books without physicalId...");
      
      // Only try books that genuinely don't have a physicalId
      const availableBooks = await Book.find({ 
        $or: [
          { physicalId: { $exists: false } },
          { physicalId: null },
          { physicalId: "" }
        ]
      });
      
      console.log(`📚 Found ${availableBooks.length} books without physicalId available for assignment`);
      
      if (availableBooks.length > 0) {
        // Use the first book without a physical ID and assign the scanned ID
        book = availableBooks[0];
        const assignedId = actualBookId.match(/^[0-9a-fA-F]{24}$/) ? actualBookId : normalizePhysicalId(actualBookId);
        
        // Update book with QR data if available
        if (bookInfo) {
          book.name = bookInfo.name;
          book.isbn = bookInfo.isbn;
          book.author = bookInfo.author;
          console.log(`📚 Updated book with QR data:`, bookInfo);
        }
        
        book.physicalId = assignedId;
        
        // Ensure the book has available copies
        if (!book.copies || book.copies <= 0) {
          book.copies = 1;
          console.log(`📚 Set book copies to 1 to make it available for borrowing`);
        }
        
        await book.save();
        console.log(`✅ Auto-assigned ID "${assignedId}" to book "${book.name}" (copies: ${book.copies})`);
      } else {
        console.log("❌ No books without physicalId found. Creating new book automatically...");
        
        // Create a new book automatically with the scanned data
        const newBookData = {
          name: bookInfo?.name || `Scanned-Book-${actualBookId.slice(-6)}`,
          author: bookInfo?.author || "Unknown Author", 
          bookNumber: `AUTO-${Date.now()}`,
          isbn: bookInfo?.isbn || actualBookId,
          genre: "General",
          color: "Blue",
          copies: 1,
          status: "Available",
          physicalId: actualBookId.match(/^[0-9a-fA-F]{24}$/) ? actualBookId : normalizePhysicalId(actualBookId)
        };
        
        const newBook = new Book(newBookData);
        book = await newBook.save();
        console.log(`✅ Auto-created new book "${book.name}" with physicalId "${newBookData.physicalId}"`);
      }
    }

    if (!book) {
      console.log("Book not found with any method. BookId:", bookId);
      return res.status(404).json({ message: "Book not found" });
    }

    console.log("Found book:", { id: book._id, name: book.name, copies: book.copies, physicalId: book.physicalId });

    if (action === "borrow") {
      // Check if student already borrowed this book
      const existingBorrow = await Borrow.findOne({
        student: student._id,
        book: book._id,
        returned: false
      });
      
      if (existingBorrow) {
        return res.status(409).json({ 
          message: "You already have this book borrowed",
          type: "duplicate_borrow",
          bookName: book.name,
          studentName: student.fullName
        });
      }

      // Check how many copies are currently borrowed
      const currentlyBorrowed = await Borrow.countDocuments({
        book: book._id,
        returned: false
      });

      // Ensure book has copies defined (default to 1 if undefined)
      if (!book.copies || book.copies <= 0) {
        book.copies = 1;
        await book.save();
        console.log(`📚 Set book "${book.name}" copies to 1`);
      }

      console.log(`📊 Book "${book.name}": Total copies: ${book.copies}, Currently borrowed: ${currentlyBorrowed}, Available: ${book.copies - currentlyBorrowed}`);

      // Check if any copies are available
      if (currentlyBorrowed >= book.copies) {
        return res.status(400).json({ 
          message: "The book has no available copy for now, please borrow other book instead",
          bookName: book.name,
          totalCopies: book.copies,
          availableCopies: book.copies - currentlyBorrowed
        });
      }

      // Create borrow record
      const borrowedAt = new Date();
      const dueDate = new Date(borrowedAt);
      dueDate.setDate(dueDate.getDate() + LOAN_DAYS);

      const borrow = new Borrow({
        student: student._id,
        book: book._id,
        borrowedAt,
        dueDate,
        method: "qr",
      });

      await borrow.save();

      // Decrease book copies (using correct field name)
      if (book.copies !== undefined) {
        await Book.findByIdAndUpdate(book._id, { $inc: { copies: -1 } });
      }

      // Update book status based on available copies
      const { updateBookStatus } = await import("./booksController.js");
      await updateBookStatus(book._id);
      console.log(`📊 Updated book "${book.name}" status after borrowing`);

      const populated = await Borrow.findById(borrow._id)
        .populate("student", "fullName studentNumber")
        .populate("book", "name author isbn physicalId bookNumber");

      res.status(201).json({ message: "Book borrowed successfully", borrow: populated });

    } else if (action === "return") {
      // For return, we need to find the borrow record by student and book
      let borrow = null;
      let bookToReturn = null;
      
      console.log("Looking for book to return with ID:", actualBookId);
      
      try {
        // First, find the book (same logic as borrowing)
        if (actualBookId.match(/^[0-9a-fA-F]{24}$/)) {
          console.log("🔍 Trying to find book by MongoDB ObjectId:", actualBookId);
          bookToReturn = await Book.findById(actualBookId);
          console.log("✅ Book lookup by ObjectId:", bookToReturn ? "Found" : "Not found");
        }
        
        // If not found, try by physicalId (legacy format)
        if (!bookToReturn) {
          const normalizedBookId = normalizePhysicalId(actualBookId);
          console.log("🔍 Trying to find book by physicalId:", normalizedBookId);
          bookToReturn = await Book.findOne({ physicalId: normalizedBookId });
          console.log("✅ Book lookup by physicalId:", bookToReturn ? "Found" : "Not found");
        }
        
        if (!bookToReturn) {
          console.log("❌ Book not found for return:", actualBookId);
          return res.status(404).json({ message: "Book not found" });
        }
        
        // Now find the active borrow record for this student and book
        console.log("🔍 Looking for active borrow record:", {
          student: student._id,
          book: bookToReturn._id
        });
        
        borrow = await Borrow.findOne({
          student: student._id,
          book: bookToReturn._id,
          returned: false
        }).populate("book").populate("student", "fullName studentNumber");
        
        console.log("Found active borrow record:", borrow ? "Yes" : "No");

      } catch (error) {
        console.error("Error finding book/borrow record:", error);
      }

      if (!borrow) {
        console.log("No active borrow record found for:", { bookId, studentId });
        return res.status(404).json({ message: "Active borrow record not found" });
      }

      // Return the book
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

      // Increase book copies (using correct field name)
      if (borrow.book && borrow.book._id) {
        await Book.findByIdAndUpdate(borrow.book._id, { $inc: { copies: 1 } });
        
        // Update book status based on available copies
        const { updateBookStatus } = await import("./booksController.js");
        await updateBookStatus(borrow.book._id);
        console.log(`📊 Updated book "${borrow.book.name}" status after returning`);
      }

      res.json({ message: "Book returned successfully", borrow, fine });
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
