// backend/routes/borrow.js
import express from "express";
import {
  getBorrowRecords,
  borrowBook,
  returnBook,
  borrowBookByQR,
  returnBookByQR,
  getBorrowActivities,
  getFineQueue,
  getStudentBorrowedBooks,
  deleteAllBorrowRecords,
  getStudentBorrowProfile,
  borrowReturnBookByQR,
  payStudentFine,
} from "../controllers/borrowController.js";
import { authMiddleware } from "../middleware/auth.js"; // optional: if you have auth

const router = express.Router();

router.get("/", authMiddleware, getBorrowRecords); // GET /api/borrow/
router.post("/borrow", authMiddleware, borrowBook); // POST /api/borrow/borrow
router.post("/borrow/qr", authMiddleware, borrowBookByQR); // POST /api/borrow/borrow/qr
router.post("/return/:borrowId", authMiddleware, returnBook); // POST /api/borrow/return/:borrowId
router.post("/return/qr", authMiddleware, returnBookByQR); // POST /api/borrow/return/qr

// QR Popup specific routes (temporarily removed auth for testing)
router.post("/scan/student", getStudentBorrowProfile); // GET student profile for QR popup
router.post("/scan/book", borrowReturnBookByQR); // Borrow/Return book via QR popup
router.post("/pay/fine", payStudentFine); // Pay student fine

router.get("/activities", getBorrowActivities); // Removed auth for dashboard display
router.get("/fines", authMiddleware, getFineQueue);
router.get("/student/:studentNumber", authMiddleware, getStudentBorrowedBooks);

router.delete("/all", authMiddleware, deleteAllBorrowRecords);

export default router;
