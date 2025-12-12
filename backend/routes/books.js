// backend/routes/books.js
import express from "express";
import {
  getBooks,
  addBook,
  updateBook,
  deleteBook,
  deleteAllBooks,
  deleteByCategoryAll,
  getBookStats,
  getAllInventory,
  setPhysicalId,
  debugBooks,
  cleanupBookStatus,
  bulkImport
} from "../controllers/booksController.js";

const router = express.Router();

router.get("/", getBooks); // Get books by inventory type (?inventoryType=masterlist)
router.get("/all", getAllInventory); // Get all inventory items combined
router.post("/", addBook); // Add book to specific inventory type
router.put("/:id", updateBook); // Update book in specific inventory type
router.delete("/:id", deleteBook); // Delete book from specific inventory type (?inventoryType=masterlist)
router.delete("/category/all", deleteByCategoryAll); // Delete all books from specific category (?category=ListofBookHoldings)
router.delete("/all", deleteAllBooks); // Delete all books from all inventory types
router.post("/set-physical-id", setPhysicalId); // Set physical ID for scanner compatibility
router.get("/debug", debugBooks); // Debug endpoint to show all book IDs
router.get("/stats", getBookStats); // Book statistics across all inventory types
router.post("/cleanup-status", cleanupBookStatus); // Cleanup invalid status values
router.post("/import", bulkImport); // Bulk import from CSV

export default router;
