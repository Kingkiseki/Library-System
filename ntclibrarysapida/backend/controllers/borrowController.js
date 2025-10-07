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
    const { studentId, bookId, action } = req.body;
    console.log("📚 QR Book Action:", { studentId, bookId, action });
    
    // Debug the bookId value in detail
    console.log("🔍 BACKEND BOOK ID DEBUG:");
    console.log("  Raw value:", JSON.stringify(bookId));
    console.log("  Type:", typeof bookId);
    console.log("  Length:", bookId?.length);
    console.log("  Char codes:", bookId ? Array.from(bookId.toString()).map(c => c.charCodeAt(0)) : 'N/A');
    console.log("  Trimmed:", JSON.stringify(bookId?.toString().trim()));
    console.log("  Trimmed length:", bookId?.toString().trim().length);
    
    if (!studentId || !bookId || !action) {
      return res.status(400).json({ message: "studentId, bookId, and action are required" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    let book = null;
    
    // Try to find book by different possible ID formats
    // First try by physicalId (most common for QR scanning)
    const normalizedBookId = normalizePhysicalId(bookId);
    console.log("🔍 UPDATED CODE: Trying to find book by physicalId:", normalizedBookId);
    console.log("🔍 Original bookId:", bookId);
    console.log("🔍 Normalized bookId:", normalizedBookId);
    
    try {
      book = await Book.findOne({ physicalId: normalizedBookId });
      console.log("✅ Book lookup by physicalId successful:", book ? "Found" : "Not found");
    } catch (error) {
      console.error("❌ Error in physicalId lookup:", error);
    }
    
    if (!book) {
      // Try by bookNumber
      console.log("Trying to find book by bookNumber:", bookId);
      book = await Book.findOne({ bookNumber: bookId });
      console.log("Book lookup by bookNumber:", book ? "Found" : "Not found");
    }
    
    if (!book) {
      // Try by ISBN
      console.log("Trying to find book by ISBN:", bookId);
      book = await Book.findOne({ isbn: bookId });
      console.log("Book lookup by ISBN:", book ? "Found" : "Not found");
    }
    
    // Try by name (partial match for flexibility)
    if (!book) {
      console.log("Trying to find book by name containing:", bookId);
      book = await Book.findOne({ name: new RegExp(bookId, 'i') });
      console.log("Book lookup by name:", book ? "Found" : "Not found");
    }
    
    // Finally try by MongoDB ObjectId (only if it's a valid ObjectId format)
    if (!book && bookId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log("Trying to find book by MongoDB ObjectId:", bookId);
      book = await Book.findById(bookId);
      console.log("Book lookup by ObjectId:", book ? "Found" : "Not found");
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
        // Use the first book without a physicalId and assign the scanned ID
        book = availableBooks[0];
        book.physicalId = normalizedBookId;
        
        // Ensure the book has available copies
        if (!book.copies || book.copies <= 0) {
          book.copies = 1;
          console.log(`📚 Set book copies to 1 to make it available for borrowing`);
        }
        
        await book.save();
        console.log(`✅ Auto-assigned physicalId "${normalizedBookId}" to book "${book.name}" (copies: ${book.copies})`);
      } else {
        console.log("❌ No books without physicalId found. Creating new book automatically...");
        
        // Create a new book automatically with the scanned physical ID
        const newBook = new Book({
          name: `Scanned-Book-${normalizedBookId.slice(-6)}`,
          author: "Unknown Author", 
          bookNumber: `AUTO-${Date.now()}`,
          isbn: normalizedBookId,
          genre: "General",
          color: "Blue",
          copies: 1,
          status: "Available",
          physicalId: normalizedBookId
        });
        
        book = await newBook.save();
        console.log(`✅ Auto-created new book "${book.name}" with physicalId "${normalizedBookId}"`);
      }
    }

    if (!book) {
      console.log("Book not found with any method. BookId:", bookId);
      return res.status(404).json({ message: "Book not found" });
    }

    console.log("Found book:", { id: book._id, name: book.name, copies: book.copies, physicalId: book.physicalId });

    if (action === "borrow") {
      // Check if book is available and fix copies if needed
      if (book.copies !== undefined && book.copies <= 0) {
        console.log(`📚 Book "${book.name}" has ${book.copies} copies. Setting to 1 to make it available.`);
        book.copies = 1;
        await book.save();
        console.log(`✅ Updated book "${book.name}" to have ${book.copies} copies available.`);
      }

      // Check if student already borrowed this book
      const existingBorrow = await Borrow.findOne({
        student: student._id,
        book: book._id,
        returned: false
      });
      
      if (existingBorrow) {
        return res.status(400).json({ message: "Student already borrowed this book" });
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

      const populated = await Borrow.findById(borrow._id)
        .populate("student", "fullName studentNumber")
        .populate("book", "name author isbn physicalId bookNumber");

      res.status(201).json({ message: "Book borrowed successfully", borrow: populated });

    } else if (action === "return") {
      // For return, bookId is actually the borrowId
      let borrow = null;
      
      console.log("Looking for borrow record with ID:", bookId);
      
      try {
        // Try as borrowId first (most likely case)
        borrow = await Borrow.findById(bookId).populate("book");
        console.log("Found borrow record:", borrow ? "Yes" : "No");
        
        if (!borrow) {
          // Try to find by book ID and student
          const foundBook = await Book.findById(bookId);
          if (foundBook) {
            borrow = await Borrow.findOne({
              student: student._id,
              book: bookId,
              returned: false
            }).populate("book");
          }
        }

      } catch (error) {
        console.error("Error finding borrow record:", error);
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
