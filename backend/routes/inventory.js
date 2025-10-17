// backend/routes/inventory.js
import express from "express";
import {
  // Master List
  getMasterList,
  addMasterListEntry,
  updateMasterListEntry,
  deleteMasterListEntry,
  
  // Library Collection
  getLibraryCollection,
  addLibraryCollectionEntry,
  updateLibraryCollectionEntry,
  deleteLibraryCollectionEntry,
  
  // Book Holdings
  getBookHoldings,
  addBookHoldingEntry,
  updateBookHoldingEntry,
  deleteBookHoldingEntry,
  
  // Ebooks
  getEbooks,
  addEbookEntry,
  updateEbookEntry,
  deleteEbookEntry,
  
  // Stats
  getInventoryStats
} from "../controllers/inventoryController.js";

const router = express.Router();

// Master List routes
router.get("/master-list", getMasterList);
router.post("/master-list", addMasterListEntry);
router.put("/master-list/:id", updateMasterListEntry);
router.delete("/master-list/:id", deleteMasterListEntry);

// Library Collection routes
router.get("/library-collection", getLibraryCollection);
router.post("/library-collection", addLibraryCollectionEntry);
router.put("/library-collection/:id", updateLibraryCollectionEntry);
router.delete("/library-collection/:id", deleteLibraryCollectionEntry);

// Book Holdings routes
router.get("/book-holdings", getBookHoldings);
router.post("/book-holdings", addBookHoldingEntry);
router.put("/book-holdings/:id", updateBookHoldingEntry);
router.delete("/book-holdings/:id", deleteBookHoldingEntry);

// Ebooks routes
router.get("/ebooks", getEbooks);
router.post("/ebooks", addEbookEntry);
router.put("/ebooks/:id", updateEbookEntry);
router.delete("/ebooks/:id", deleteEbookEntry);

// Stats route
router.get("/stats", getInventoryStats);

export default router;