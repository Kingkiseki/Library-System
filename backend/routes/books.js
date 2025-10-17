// backend/routes/books.js
import express from "express";
import {
  getBooks,
  addBook,
  updateBook,
  deleteBook,
  deleteAllBooks,
  getBookStats, // ✅ must exactly match the export name
  setPhysicalId,
  debugBooks,
  cleanupBookStatus
} from "../controllers/booksController.js";

const router = express.Router();

router.get("/", getBooks);
router.post("/", addBook);
router.put("/:id", updateBook);
router.delete("/:id", deleteBook);
router.delete("/all", deleteAllBooks); // ✅ delete all books
router.post("/set-physical-id", setPhysicalId); // Set physical ID for scanner compatibility
router.get("/debug", debugBooks); // Debug endpoint to show all book IDs
router.get("/stats", getBookStats); // ✅ working stats route
router.post("/cleanup-status", cleanupBookStatus); // Cleanup invalid status values

export default router;
