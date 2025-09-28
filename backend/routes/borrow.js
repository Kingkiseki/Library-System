import express from "express";
import {
  getBorrowRecords,
  borrowBook,
  returnBook,
  getBorrowStats,
  scanStudent,
  scanBook,
  payFine,
  borrowBookByQR,
  returnBookByQR,
  getStudentProfileQR,
  getBorrowActivities,
  getFineQueue
} from "../controllers/borrowController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Borrow & Return routes
router.get("/", authMiddleware, getBorrowRecords);
router.post("/borrow", authMiddleware, borrowBook);
router.post("/return", authMiddleware, returnBook);

// QR Scan routes
router.post("/scan/student", authMiddleware, scanStudent);
router.post("/scan/book", authMiddleware, (req, res) => {
  const { action } = req.body;
  if (action === "borrow") return borrowBookByQR(req, res);
  if (action === "return") return returnBookByQR(req, res);
  res.status(400).json({ message: "Invalid action" });
});

// Pay fine
router.post("/pay/fine", authMiddleware, payFine);

// Stats & Activities
router.get("/stats", authMiddleware, getBorrowStats);
router.get("/activities", authMiddleware, getBorrowActivities);
router.get("/fine-queue", authMiddleware, getFineQueue);
router.get("/student/:id", authMiddleware, getStudentProfileQR);

export default router;
