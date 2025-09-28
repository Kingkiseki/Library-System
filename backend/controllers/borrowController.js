// controllers/borrowController.js
import Borrow from "../models/Borrow.js";
import Book from "../models/Book.js";
import Student from "../models/Student.js";

// ==================== Borrow Records ====================

// Get all borrow records
export const getBorrowRecords = async (req, res) => {
  try {
    const records = await Borrow.find()
      .populate("book")
      .populate("student");
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Borrow a book (normal/manual)
export const borrowBook = async (req, res) => {
  try {
    const { student, book } = req.body;
    const newBorrow = new Borrow({ student, book });
    await newBorrow.save();
    res.status(201).json(newBorrow);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Return a book (normal/manual)
export const returnBook = async (req, res) => {
  try {
    const { borrowId } = req.body;
    const borrow = await Borrow.findById(borrowId)
      .populate("book")
      .populate("student");

    if (!borrow) return res.status(404).json({ message: "Borrow record not found" });
    if (borrow.returnedAt) return res.status(400).json({ message: "Book already returned" });

    borrow.returnedAt = new Date();

    // Fine calculation: 7-day allowed borrow, ₱5 per extra day
    const allowedDays = 7;
    const finePerDay = 5;
    const daysBorrowed = Math.ceil((borrow.returnedAt - borrow.borrowedAt) / (1000 * 60 * 60 * 24));
    if (daysBorrowed > allowedDays) {
      borrow.fine = (daysBorrowed - allowedDays) * finePerDay;
    }

    await borrow.save();
    res.json({ message: "Book returned successfully", borrow });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ==================== Borrow Stats ====================
export const getBorrowStats = async (req, res) => {
  try {
    const totalBorrows = await Borrow.countDocuments();
    const totalReturned = await Borrow.countDocuments({ returnedAt: { $ne: null } });
    const totalUnreturned = await Borrow.countDocuments({ returnedAt: null });
    res.json({ totalBorrows, totalReturned, totalUnreturned });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== QR/Scan Features ====================

// Scan student by QR (basic)
export const scanStudent = async (req, res) => {
  try {
    const { studentId } = req.body;
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Scan book by QR (basic)
export const scanBook = async (req, res) => {
  try {
    const { bookId } = req.body;
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json(book);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Pay fine
export const payFine = async (req, res) => {
  try {
    const { borrowId } = req.body;
    const borrow = await Borrow.findById(borrowId);
    if (!borrow) return res.status(404).json({ message: "Borrow record not found" });
    borrow.fine = 0;
    await borrow.save();
    res.json({ message: "Fine paid successfully", borrow });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Borrow book by QR
export const borrowBookByQR = async (req, res) => {
  try {
    const { studentId, bookId } = req.body;

    const student = await Student.findById(studentId);
    const book = await Book.findById(bookId);
    if (!student || !book) return res.status(404).json({ message: "Student or Book not found" });
    if (book.copies < 1) return res.status(400).json({ message: "No copies left" });

    // Update book copies
    book.copies -= 1;
    await book.save();

    // Create borrow record
    const newBorrow = new Borrow({
      student: studentId,
      book: bookId,
      borrowedAt: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    await newBorrow.save();

    res.status(201).json({ message: "Book borrowed successfully via QR", borrow: newBorrow });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Return book by QR
export const returnBookByQR = async (req, res) => {
  try {
    const { studentId, bookId } = req.body;

    const borrow = await Borrow.findOne({
      student: studentId,
      book: bookId,
      returnedAt: null,
    });
    if (!borrow) return res.status(404).json({ message: "Active borrow record not found" });

    borrow.returnedAt = new Date();

    // Fine calculation (same as manual return)
    const allowedDays = 7;
    const finePerDay = 5;
    const daysBorrowed = Math.ceil((borrow.returnedAt - borrow.borrowedAt) / (1000 * 60 * 60 * 24));
    if (daysBorrowed > allowedDays) {
      borrow.fine = (daysBorrowed - allowedDays) * finePerDay;
    }

    await borrow.save();

    // Return book copy
    const book = await Book.findById(bookId);
    if (book) {
      book.copies += 1;
      await book.save();
    }

    res.json({ message: "Book returned successfully via QR", borrow });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get student profile via QR (with borrowed books + fines)
export const getStudentProfileQR = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Find borrowed books
    const borrows = await Borrow.find({ student: id, returnedAt: null }).populate("book");

    const allowedDays = 7;
    const finePerDay = 5;
    let totalFines = 0;

    const borrowedBooks = borrows.map(b => {
      const dueDate = new Date(b.borrowedAt);
      dueDate.setDate(dueDate.getDate() + allowedDays);

      let fine = 0;
      if (Date.now() > dueDate) {
        const daysOverdue = Math.ceil((Date.now() - dueDate) / (1000 * 60 * 60 * 24));
        fine = daysOverdue * finePerDay;
      }
      totalFines += fine;

      return {
        _id: b._id,
        title: b.book?.title || "Unknown",
        author: b.book?.author || "Unknown",
        borrowedAt: b.borrowedAt,
        dueDate,
        fine,
      };
    });

    res.json({ student, borrowedBooks, fines: totalFines });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ==================== Borrow Activities ====================
export const getBorrowActivities = async (req, res) => {
  try {
    const activities = await Borrow.find()
      .populate("book", "title")
      .populate("student", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    const formatted = activities.map(
      b => `${b.student?.name || "Unknown student"} borrowed "${b.book?.title || "Unknown book"}" on ${b.createdAt.toLocaleString()}`
    );

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== Fine Queue ====================
export const getFineQueue = async (req, res) => {
  try {
    const overdueBorrows = await Borrow.find({ returnedAt: null })
      .populate("student", "name")
      .populate("book", "title");

    const dailyRate = 5;
    const allowedDays = 7;

    const fines = overdueBorrows
      .map(b => {
        const daysBorrowed = Math.ceil((Date.now() - b.borrowedAt) / (1000 * 60 * 60 * 24));
        const daysOverdue = daysBorrowed - allowedDays;
        if (daysOverdue > 0) {
          return {
            name: b.student?.name || "Unknown student",
            book: b.book?.title || "Unknown book",
            days: daysOverdue,
            amount: daysOverdue * dailyRate,
          };
        }
        return null;
      })
      .filter(Boolean);

    res.json(fines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
