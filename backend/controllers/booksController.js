// backend/controllers/booksController.js
import Book from "../models/Book.js";
import Borrow from "../models/Borrow.js";
import QRCode from "qrcode";

// Helper function to calculate and update book status
export const updateBookStatus = async (bookId) => {
  try {
    const book = await Book.findById(bookId);
    if (!book) return null;

    // Calculate currently borrowed copies
    const currentlyBorrowed = await Borrow.countDocuments({
      book: bookId,
      returned: false
    });

    // Calculate dynamic status (only use valid enum values)
    let newStatus = "Available";
    const totalCopies = book.copies || 0;
    const availableCopies = totalCopies - currentlyBorrowed;

    // Only use valid enum values: "Available" or "Borrowed"
    if (totalCopies === 0 || availableCopies <= 0) {
      newStatus = "Borrowed"; // All copies borrowed or no copies
    } else {
      newStatus = "Available"; // Has available copies
    }

    // Update the book status in database
    await Book.findByIdAndUpdate(bookId, { status: newStatus });
    
    return {
      status: newStatus,
      availableCopies,
      borrowedCopies: currentlyBorrowed
    };
  } catch (error) {
    console.error("Error updating book status:", error);
    return null;
  }
};

// ==================== Get all books ====================
export const getBooks = async (req, res) => {
  try {
    const books = await Book.find();
    
    // Import Borrow model to calculate dynamic status
    const { default: Borrow } = await import("../models/Borrow.js");

    const formatted = await Promise.all(books.map(async (b) => {
      // Calculate currently borrowed copies for this book
      const currentlyBorrowed = await Borrow.countDocuments({
        book: b._id,
        returned: false
      });

      // Calculate dynamic status based on available copies (only valid enum values)
      let dynamicStatus = "Available";
      const totalCopies = b.copies || 0;
      const availableCopies = Math.max(0, totalCopies - currentlyBorrowed); // Prevent negative

      // Only use valid enum values: "Available" or "Borrowed"
      if (totalCopies === 0 || availableCopies <= 0) {
        dynamicStatus = "Borrowed"; // All copies borrowed or no copies
      } else {
        dynamicStatus = "Available"; // Has available copies
      }

      return {
        _id: b._id,
        bookNumber: b.bookNumber,
        name: b.name,
        isbn: b.isbn,
        genre: b.genre,
        author: b.author,
        color: b.color,
        copies: b.copies,
        status: dynamicStatus, // Use calculated status instead of static
        availableCopies: availableCopies,
        borrowedCopies: currentlyBorrowed,
        qrCode: b.qrCode || "",
        physicalId: b.physicalId || "", // Include physical ID
      };
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== Add book (with QR) ====================
export const addBook = async (req, res) => {
  try {
    const { name, isbn, genre, author, color, copies, status, physicalId: providedPhysicalId } = req.body;

    if (!name || !author) {
      return res.status(400).json({ message: "Name and Author are required" });
    }

    // Generate unique book number
    const currentYear = new Date().getFullYear();
    const lastBook = await Book.findOne({
      bookNumber: new RegExp(`^${currentYear}-`)
    }).sort({ createdAt: -1 });

    let nextNumber = 1;
    if (lastBook) {
      const lastNumber = parseInt(lastBook.bookNumber.split("-")[1]);
      nextNumber = lastNumber + 1;
    }

    const bookNumber = `${currentYear}-${String(nextNumber).padStart(4, "0")}`;

    let physicalId = null;
    
    // Use provided Physical ID if given, otherwise auto-generate
    if (providedPhysicalId && providedPhysicalId.trim()) {
      // Check if provided Physical ID is already in use
      const existingBook = await Book.findOne({ physicalId: providedPhysicalId.trim() });
      if (existingBook) {
        return res.status(400).json({ 
          message: `Physical ID "${providedPhysicalId}" is already assigned to "${existingBook.name}"` 
        });
      }
      physicalId = providedPhysicalId.trim();
      console.log(`📱 Using provided Physical ID: ${physicalId}`);
    } else {
      // Auto-generate Physical ID in scanner-compatible format (17 digits like scanner)
      const generatePhysicalId = () => {
        // Generate 17-digit number to match scanner format: 68294652279404930
        const timestamp = Date.now().toString(); // Full timestamp
        const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0'); // 5 random digits
        const combined = timestamp + random;
        // Take last 17 digits to match scanner format
        return combined.slice(-17);
      };

      physicalId = generatePhysicalId();
      
      // Ensure the generated physical ID is unique
      while (await Book.findOne({ physicalId })) {
        physicalId = generatePhysicalId();
      }
      console.log(`🔧 Auto-generated Physical ID: ${physicalId}`);
    }

    const book = new Book({
      bookNumber,
      name,
      isbn,
      genre,
      author,
      color,
      copies: copies || 1,
      status: status || "Available",
      physicalId, // Automatically assign physical ID
    });

    const saved = await book.save();

    // Generate QR code with both bookId and bookNumber for compatibility
    const qrPayload = JSON.stringify({ 
      bookId: saved._id.toString(),
      bookNumber: saved.bookNumber,
      type: "book"
    });
    const qrCode = await QRCode.toDataURL(qrPayload);

    // Update the book with the QR code
    saved.qrCode = qrCode;
    await saved.save();

    res.status(201).json({
      _id: saved._id,
      bookNumber: saved.bookNumber,
      name: saved.name,
      isbn: saved.isbn,
      genre: saved.genre,
      author: saved.author,
      color: saved.color,
      copies: saved.copies,
      status: saved.status,
      qrCode: saved.qrCode,
      physicalId: saved.physicalId, // Include physical ID in response
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ==================== Update book ====================
export const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isbn, genre, author, color, copies, status } = req.body;

    const updated = await Book.findByIdAndUpdate(
      id,
      { name, isbn, genre, author, color, copies, status },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Book not found" });

    res.json({
      _id: updated._id,
      name: updated.name,
      isbn: updated.isbn,
      genre: updated.genre,
      author: updated.author,
      color: updated.color,
      copies: updated.copies,
      status: updated.status,
      qrCode: updated.qrCode,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ==================== Delete book ====================
export const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Book.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ message: "Book not found" });

    res.json({ message: "Book deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== Delete all books (for fresh start) ====================
export const deleteAllBooks = async (req, res) => {
  try {
    const result = await Book.deleteMany({});
    res.json({ 
      message: `Successfully deleted ${result.deletedCount} books`,
      deletedCount: result.deletedCount 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// ==================== Book Stats ====================
export const getBookStats = async (req, res) => {
  try {
    // Get total books added
    const totalBooks = await Book.countDocuments();
    
    // Get available books (books with copies > 0)
    const availableBooks = await Book.countDocuments({ copies: { $gt: 0 } });
    
    // Get borrowed books from Borrow collection
    const Borrow = (await import("../models/Borrow.js")).default;
    const borrowedBooks = await Borrow.countDocuments({ returned: false });
    
    // Get returned books from Borrow collection
    const returnedBooks = await Borrow.countDocuments({ returned: true });

    res.json({
      Added: totalBooks,
      Available: availableBooks,
      Borrowed: borrowedBooks,
      Returned: returnedBooks,
    });
  } catch (err) {
    console.error("Error fetching book stats:", err);
    res.status(500).json({ message: err.message });
  }
};

// ==================== Set Physical ID for a book ====================
export const setPhysicalId = async (req, res) => {
  try {
    const { bookId, physicalId } = req.body;
    
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    
    // Check if this physical ID is already used
    const existing = await Book.findOne({ physicalId });
    if (existing && existing._id.toString() !== bookId) {
      return res.status(400).json({ 
        message: `Physical ID ${physicalId} is already assigned to "${existing.name}"` 
      });
    }
    
    book.physicalId = physicalId;
    await book.save();
    
    res.json({ 
      message: `Physical ID ${physicalId} assigned to "${book.name}"`,
      book: {
        _id: book._id,
        name: book.name,
        bookNumber: book.bookNumber,
        physicalId: book.physicalId
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== Debug: Show all books with their IDs ====================
export const debugBooks = async (req, res) => {
  try {
    const books = await Book.find({}, 'name bookNumber physicalId _id').lean();
    
    console.log("=== DEBUG: All Books in Database ===");
    books.forEach(book => {
      console.log(`Book: ${book.name}`);
      console.log(`  - MongoDB ID: ${book._id}`);
      console.log(`  - Book Number: ${book.bookNumber || 'Not set'}`);
      console.log(`  - Physical ID: ${book.physicalId || 'Not set'}`);
      console.log('---');
    });
    
    res.json({
      message: `Found ${books.length} books`,
      books: books.map(book => ({
        name: book.name,
        mongoId: book._id,
        bookNumber: book.bookNumber,
        physicalId: book.physicalId
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== Cleanup invalid status values ====================
export const cleanupBookStatus = async (req, res) => {
  try {
    // Find books with invalid status and fix them
    const result = await Book.updateMany(
      { status: { $nin: ["Available", "Borrowed"] } }, // Not in valid enum values
      { status: "Available" } // Set to default valid value
    );
    
    res.json({ 
      message: `Cleaned up ${result.modifiedCount} books with invalid status`,
      modifiedCount: result.modifiedCount 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
