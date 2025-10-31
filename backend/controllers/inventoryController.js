// backend/controllers/inventoryController.js
import MasterList from "../models/MasterList.js";
import LibraryCollection from "../models/LIbraryCollection.js";
import ListofBookHoldings from "../models/ListofBookHoldings.js";
import Ebooks from "../models/Ebooks.js";

// ==================== MASTER LIST OPERATIONS ====================

// Get all master list entries
export const getMasterList = async (req, res) => {
  try {
    const masterList = await MasterList.find().sort({ "Accession Number": 1 });
    res.json(masterList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add master list entry
export const addMasterListEntry = async (req, res) => {
  try {
    const { "Accession Number": accessionNumber, "Date Received": dateReceived, Author, "Book Title": bookTitle, "Call Number": callNumber } = req.body;
    
    if (!accessionNumber || !dateReceived || !Author || !bookTitle || !callNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if accession number already exists
    const existing = await MasterList.findOne({ "Accession Number": accessionNumber });
    if (existing) {
      return res.status(400).json({ message: "Accession number already exists" });
    }

    const entry = new MasterList({
      "Accession Number": accessionNumber,
      "Date Received": new Date(dateReceived),
      Author,
      "Book Title": bookTitle,
      "Call Number": callNumber,
    });

    const saved = await entry.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update master list entry
export const updateMasterListEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updated = await MasterList.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: "Entry not found" });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete master list entry
export const deleteMasterListEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await MasterList.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Entry not found" });

    res.json({ message: "Entry deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== LIBRARY COLLECTION OPERATIONS ====================

// Get all library collection entries
export const getLibraryCollection = async (req, res) => {
  try {
    const collection = await LibraryCollection.find().sort({ no: 1 });
    res.json(collection);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add library collection entry
export const addLibraryCollectionEntry = async (req, res) => {
  try {
    const { no, Type, "Name Publisher": namePublisher, Publication, Frequency, "Regular Subscription": regularSubscription, "Supporting Documents Link": supportingDocsLink } = req.body;
    
    if (!no || !Type || !namePublisher || !Publication || !Frequency || !regularSubscription || !supportingDocsLink) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if number already exists
    const existing = await LibraryCollection.findOne({ no });
    if (existing) {
      return res.status(400).json({ message: "Entry number already exists" });
    }

    const entry = new LibraryCollection({
      no,
      Type,
      "Name Publisher": namePublisher,
      Publication,
      Frequency,
      "Regular Subscription": regularSubscription,
      "Supporting Documents Link": supportingDocsLink,
    });

    const saved = await entry.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update library collection entry
export const updateLibraryCollectionEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updated = await LibraryCollection.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: "Entry not found" });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete library collection entry
export const deleteLibraryCollectionEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await LibraryCollection.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Entry not found" });

    res.json({ message: "Entry deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== BOOK HOLDINGS OPERATIONS ====================

// Get all book holdings
export const getBookHoldings = async (req, res) => {
  try {
    const holdings = await ListofBookHoldings.find().sort({ no: 1 });
    res.json(holdings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add book holding entry
export const addBookHoldingEntry = async (req, res) => {
  try {
    const { no, coltype, classification, booktitle, author, pubyear, volumes } = req.body;
    
    if (!no || !coltype || !classification || !booktitle || !author || !pubyear || !volumes) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if number already exists
    const existing = await ListofBookHoldings.findOne({ no });
    if (existing) {
      return res.status(400).json({ message: "Entry number already exists" });
    }

    const entry = new ListofBookHoldings({
      no,
      coltype,
      classification,
      booktitle,
      author,
      pubyear,
      volumes,
    });

    const saved = await entry.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update book holding entry
export const updateBookHoldingEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updated = await ListofBookHoldings.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: "Entry not found" });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete book holding entry
export const deleteBookHoldingEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ListofBookHoldings.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Entry not found" });

    res.json({ message: "Entry deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== EBOOKS OPERATIONS ====================

// Get all ebooks
export const getEbooks = async (req, res) => {
  try {
    const ebooks = await Ebooks.find().sort({ "Accession Number": 1 });
    res.json(ebooks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add ebook entry
export const addEbookEntry = async (req, res) => {
  try {
    const { "Accession Number": accessionNumber, "Date Received": dateReceived, Author, "Book Title": bookTitle, Edition, Pages, Publisher, "Call Number": callNumber } = req.body;
    
    if (!accessionNumber || !dateReceived || !Author || !bookTitle || !Edition || !Pages || !Publisher || !callNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if accession number already exists
    const existing = await Ebooks.findOne({ "Accession Number": accessionNumber });
    if (existing) {
      return res.status(400).json({ message: "Accession number already exists" });
    }

    const entry = new Ebooks({
      "Accession Number": accessionNumber,
      "Date Received": dateReceived,
      Author,
      "Book Title": bookTitle,
      Edition,
      Pages,
      Publisher,
      "Call Number": callNumber,
    });

    const saved = await entry.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update ebook entry
export const updateEbookEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updated = await Ebooks.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: "Entry not found" });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete ebook entry
export const deleteEbookEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Ebooks.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Entry not found" });

    res.json({ message: "Entry deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== INVENTORY STATS ====================

// Get inventory statistics
export const getInventoryStats = async (req, res) => {
  try {
    const masterListCount = await MasterList.countDocuments();
    const libraryCollectionCount = await LibraryCollection.countDocuments();
    const bookHoldingsCount = await ListofBookHoldings.countDocuments();
    const ebooksCount = await Ebooks.countDocuments();

    // Get book holdings by collection type
    const collectionTypes = await ListofBookHoldings.aggregate([
      { $group: { _id: "$coltype", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      masterList: masterListCount,
      libraryCollection: libraryCollectionCount,
      bookHoldings: bookHoldingsCount,
      ebooks: ebooksCount,
      collectionTypes: collectionTypes.map(item => ({ type: item._id, count: item.count }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get book statistics for dashboard (replaces legacy /books/stats)
export const getBookStats = async (req, res) => {
  try {
    // Import Borrow model
    const Borrow = (await import("../models/Borrow.js")).default;
    
    // Calculate total books added across all inventory types
    const masterListCount = await MasterList.countDocuments();
    const bookHoldingsCount = await ListofBookHoldings.countDocuments();
    const ebooksCount = await Ebooks.countDocuments();
    const totalAdded = masterListCount + bookHoldingsCount + ebooksCount;
    
    // Calculate available books (physical books with volumes > 0)
    const availableBooks = await ListofBookHoldings.countDocuments({ volumes: { $gt: 0 } });
    
    // Get borrowed books from Borrow collection (not returned)
    const borrowedBooks = await Borrow.countDocuments({ returned: false });
    
    // Get returned books from Borrow collection
    const returnedBooks = await Borrow.countDocuments({ returned: true });

    res.json({
      Added: totalAdded,
      Available: availableBooks,
      Borrowed: borrowedBooks,
      Returned: returnedBooks,
    });
  } catch (err) {
    console.error("Error fetching book stats:", err);
    res.status(500).json({ message: err.message });
  }
};