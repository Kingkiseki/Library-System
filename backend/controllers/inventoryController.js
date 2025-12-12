// backend/controllers/inventoryController.js
import MasterList from "../models/MasterList.js";
import LibraryCollection from "../models/LibraryCollection.js";
import ListofBookHoldings from "../models/ListofBookHoldings.js";
import Ebooks from "../models/Ebooks.js";

// ==================== MASTER LIST OPERATIONS ====================

// Get all master list entries with pagination
export const getMasterList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100; // Default 100 items per page
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    // Build search query
    const searchQuery = search ? {
      $or: [
        { "Book Title": { $regex: search, $options: 'i' } },
        { "Author": { $regex: search, $options: 'i' } },
        { "Call Number": { $regex: search, $options: 'i' } }
      ]
    } : {};

    const [masterList, total] = await Promise.all([
      MasterList.find(searchQuery)
        .sort({ "Accession Number": 1 })
        .skip(skip)
        .limit(limit)
        .lean(), // Use lean() for faster queries
      MasterList.countDocuments(searchQuery)
    ]);

    res.json({
      data: masterList,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add master list entry
export const addMasterListEntry = async (req, res) => {
  try {
    console.log("📝 MasterList ADD request body:", req.body);
    
    const { 
      "Accession Number": accessionNumber, 
      "Date Received": dateReceived, 
      Author, 
      "Book Title": bookTitle, 
      Edition,
      Volume,
      Pages,
      Publisher,
      Copyright,
      "Call Number": callNumber 
    } = req.body;
    
    // Validate all required fields
    if (!accessionNumber || !dateReceived || !Author || !bookTitle || !Edition || !Volume || !Pages || !Publisher || !Copyright || !callNumber) {
      console.log("❌ Missing required fields:", {
        accessionNumber: !!accessionNumber,
        dateReceived: !!dateReceived,
        Author: !!Author,
        bookTitle: !!bookTitle,
        Edition: !!Edition,
        Volume: !!Volume,
        Pages: !!Pages,
        Publisher: !!Publisher,
        Copyright: !!Copyright,
        callNumber: !!callNumber
      });
      return res.status(400).json({ 
        message: "All fields are required",
        missingFields: {
          accessionNumber: !accessionNumber,
          dateReceived: !dateReceived,
          Author: !Author,
          bookTitle: !bookTitle,
          Edition: !Edition,
          Volume: !Volume,
          Pages: !Pages,
          Publisher: !Publisher,
          Copyright: !Copyright,
          callNumber: !callNumber
        }
      });
    }

    // Check if accession number already exists
    const existing = await MasterList.findOne({ "Accession Number": accessionNumber });
    if (existing) {
      return res.status(400).json({ message: "Accession number already exists" });
    }

    const entry = new MasterList({
      "Accession Number": parseInt(accessionNumber),
      "Date Received": new Date(dateReceived),
      Author,
      "Book Title": bookTitle,
      Edition,
      Volume: parseInt(Volume),
      Pages: parseInt(Pages),
      Publisher,
      Copyright,
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

// Get all library collection entries with pagination
export const getLibraryCollection = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const searchQuery = search ? {
      $or: [
        { "Book Title": { $regex: search, $options: 'i' } },
        { "Author": { $regex: search, $options: 'i' } },
        { "Course Name": { $regex: search, $options: 'i' } }
      ]
    } : {};

    const [collection, total] = await Promise.all([
      LibraryCollection.find(searchQuery)
        .sort({ No: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LibraryCollection.countDocuments(searchQuery)
    ]);

    res.json({
      data: collection,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add library collection entry
export const addLibraryCollectionEntry = async (req, res) => {
  try {
    console.log("📝 LibraryCollection ADD request body:", req.body);
    
    const { 
      No, 
      "Collection Type": collectionType, 
      "Gen.Ed./Prof.Ed.": genEdProfEd, 
      "Course Name": courseName,
      "Book Title": bookTitle,
      Author,
      "Publication Year": publicationYear,
      "No. of Book Copies": bookCopies
    } = req.body;
    
    if (!No || !collectionType || !genEdProfEd || !courseName || !bookTitle || !Author || !publicationYear || !bookCopies) {
      console.log("❌ Missing required fields:", {
        No: !!No,
        collectionType: !!collectionType,
        genEdProfEd: !!genEdProfEd,
        courseName: !!courseName,
        bookTitle: !!bookTitle,
        Author: !!Author,
        publicationYear: !!publicationYear,
        bookCopies: !!bookCopies
      });
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if number already exists
    const existing = await LibraryCollection.findOne({ No });
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

// Get all book holdings with pagination
export const getBookHoldings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const searchQuery = search ? {
      $or: [
        { "Book Title": { $regex: search, $options: 'i' } },
        { "Author": { $regex: search, $options: 'i' } },
        { "Classification": { $regex: search, $options: 'i' } }
      ]
    } : {};

    const [holdings, total] = await Promise.all([
      ListofBookHoldings.find(searchQuery)
        .sort({ No: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ListofBookHoldings.countDocuments(searchQuery)
    ]);

    res.json({
      data: holdings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
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

// Get all ebooks with pagination
export const getEbooks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const searchQuery = search ? {
      $or: [
        { "Book Title": { $regex: search, $options: 'i' } },
        { "Author": { $regex: search, $options: 'i' } },
        { "Call Number": { $regex: search, $options: 'i' } }
      ]
    } : {};

    const [ebooks, total] = await Promise.all([
      Ebooks.find(searchQuery)
        .sort({ "Accession Number": 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Ebooks.countDocuments(searchQuery)
    ]);

    res.json({
      data: ebooks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
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
    const bookHoldingsCount = await ListofBookHoldings.countDocuments(); // Physical books
    const ebooksCount = await Ebooks.countDocuments();
    const totalAdded = masterListCount + bookHoldingsCount + ebooksCount;
    
    // Calculate available physical books (Book Holdings with volumes > 0)
    const availableBooks = await ListofBookHoldings.countDocuments({ Volumes: { $gt: 0 } });
    
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