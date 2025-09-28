// backend/controllers/booksController.js
import Book from "../models/Book.js";
import QRCode from "qrcode";

// ==================== Get all books ====================
export const getBooks = async (req, res) => {
  try {
    const books = await Book.find();

    const formatted = books.map((b) => ({
      _id: b._id,
      title: b.title,
      author: b.author,
      category: b.category,
      copies: b.copies,
      qrCode: b.qrCode || "", // include QR in response
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== Add book (with QR) ====================
export const addBook = async (req, res) => {
  try {
    const { title, author, category, copies } = req.body;

    // Generate unique QR code for book
    const qrData = `${title}-${author}-${Date.now()}`;
    const qrCode = await QRCode.toDataURL(qrData);

    const book = new Book({
      title,
      author,
      category,
      copies,
      qrCode, // store QR in DB
    });

    const saved = await book.save();

    res.status(201).json({
      _id: saved._id,
      title: saved.title,
      author: saved.author,
      category: saved.category,
      copies: saved.copies,
      qrCode: saved.qrCode, // return QR
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ==================== Update book ====================
export const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, category, copies } = req.body;

    const updated = await Book.findByIdAndUpdate(
      id,
      { title, author, category, copies },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Book not found" });

    res.json({
      _id: updated._id,
      title: updated.title,
      author: updated.author,
      category: updated.category,
      copies: updated.copies,
      qrCode: updated.qrCode, // keep QR intact
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

// ==================== Book Stats ====================
export const getBookStats = async (req, res) => {
  try {
    const totalBooks = await Book.countDocuments();
    const totalCopies = await Book.aggregate([
      { $group: { _id: null, total: { $sum: "$copies" } } }
    ]);

    res.json({
      totalBooks,
      totalCopies: totalCopies[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
