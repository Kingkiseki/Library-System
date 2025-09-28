import express from "express";
import {
  getBooks,
  addBook,
  updateBook,
  deleteBook,
  getBookStats, // ✅ must exactly match the export name
} from "../controllers/booksController.js";

const router = express.Router();

router.get("/", getBooks);
router.post("/", addBook);
router.put("/:id", updateBook);
router.delete("/:id", deleteBook);
router.get("/stats", getBookStats); // ✅ working stats route

export default router;
