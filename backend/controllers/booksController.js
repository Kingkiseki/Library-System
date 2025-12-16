// backend/controllers/booksController.js
import QRCode from "qrcode";
import { Borrow, findAll, findById, createItem, updateItem, deleteItem, deleteAllItems, getAllStats, findAllPaginated, findAllWithSearch, getTotalCount } from "../models/index.js";

// These functions are no longer needed since we use direct model access

// Helper function to normalize field names for different inventory types
const normalizeInventoryData = (data, inventoryType) => {
  const commonFields = {
    title: data["Book Title"] || data.name || data.title || "Unknown Title",
    author: data["Author"] || data.author || "Unknown Author",
  };

  switch (inventoryType) {
    case 'masterlist':
    case 'MasterList':
      // Ensure required fields have valid values
      const accessionNumber = data["Accession Number"] || `AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const author = data["Author"] || data.author || "Unknown Author";
      const bookTitle = data["Book Title"] || data.title || data.Title || "Unknown Title";
      
      console.log(`🔧 Normalizing MasterList data:`, {
        "Accession Number": accessionNumber,
        "Author": author,
        "Book Title": bookTitle,
        "Original data": data
      });
      
      return {
        "Accession Number": accessionNumber,
        "Date Received": data["Date Received"] ? new Date(data["Date Received"]) : new Date(),
        "Author": author,
        "Book Title": bookTitle,
        "Edition": data["Edition"] || "1st Edition",
        "Volume": data["Volume"] || "1",
        "Pages": data["Pages"] || "N/A",
        "Publisher": data["Publisher"] || "Unknown Publisher",
        "Copyright": data["Copyright"] || data["Copyright/Imprint"] || new Date().getFullYear().toString(),
        "Call Number": data["Call Number"] || `REF${accessionNumber}`
      };
    
    case 'librarycollection':
    case 'LibraryCollection':
      return {
        "School Year Semester": data["School Year Semester"] ? String(data["School Year Semester"]) : "",
        "No": data["No"] ? String(data["No"]) : "",
        "Collection Type": data["Collection Type"] ? String(data["Collection Type"]) : "",
        "Gen Ed Prof Ed": data["Gen.Ed./Prof.Ed."] ? String(data["Gen.Ed./Prof.Ed."]) : 
                         data["Gen Ed Prof Ed"] ? String(data["Gen Ed Prof Ed"]) : "",
        "Course Name": data["Course Name"] ? String(data["Course Name"]) : "",
        "Book Title": data["Book Title"] ? String(data["Book Title"]) : "",
        "Author": data["Author"] ? String(data["Author"]) : "",
        "Publication Year": data["Publication Year"] ? String(data["Publication Year"]) : "",
        "No of Book Copies": data["No. of Book Copies"] ? String(data["No. of Book Copies"]) : 
                            data["No of Book Copies"] ? String(data["No of Book Copies"]) : ""
      };
    
    case 'bookholdings':
    case 'ListofBookHoldings':
      return {
        "No": data["No"] ? String(data["No"]) : "",
        "Collection Type": data["Collection Type"] ? String(data["Collection Type"]) : "",
        "Classification": data["Classification"] ? String(data["Classification"]) : "",
        "Course Name": data["Course Name"] ? String(data["Course Name"]) : "",
        "Book Title": data["Book Title"] ? String(data["Book Title"]) : "",
        "Author": data["Author"] ? String(data["Author"]) : "",
        "Publication Year": data["Publication Year"] ? String(data["Publication Year"]) : "",
        "Volumes": data["Volumes"] ? String(data["Volumes"]) : ""
      };
    
    case 'ebooks':
    case 'Ebooks':
      return {
        "Accession Number": data["Accession Number"] ? String(data["Accession Number"]) : "",
        "Date Received": data["Date Received"] ? String(data["Date Received"]) : "",
        "Author": data["Author"] ? String(data["Author"]) : "",
        "Book Title": data["Book Title"] ? String(data["Book Title"]) : "",
        "Edition": data["Edition"] ? String(data["Edition"]) : "",
        "Volume": data["Volume"] ? String(data["Volume"]) : "",
        "Pages": data["Pages"] ? String(data["Pages"]) : "",
        "Publisher": data["Publisher"] ? String(data["Publisher"]) : "",
        "Copyright": data["Copyright"] ? String(data["Copyright"]) : "",
        "Call Number": data["Call Number"] ? String(data["Call Number"]) : ""
      };
    
    default:
      return data;
  }
};

// Helper function to calculate inventory item status
export const updateInventoryStatus = async (inventoryItemId, inventoryType) => {
  try {
    // Get item data using centralized models
    const item = await findById(inventoryType, inventoryItemId);
    if (!item) return null;

    // Calculate currently borrowed copies
    const currentlyBorrowed = await Borrow.countDocuments({
      inventoryItemId: inventoryItemId,
      returned: false
    });

    // Calculate dynamic status
    let newStatus = "Available";
    const totalCopies = item.copies || 1; // Default to 1 copy
    const availableCopies = totalCopies - currentlyBorrowed;

    if (totalCopies === 0 || availableCopies <= 0) {
      newStatus = "Borrowed";
    } else {
      newStatus = "Available";
    }
    
    return {
      status: newStatus,
      availableCopies,
      borrowedCopies: currentlyBorrowed
    };
  } catch (error) {
    console.error("Error updating inventory status:", error);
    return null;
  }
};

// ==================== Get all books from specific inventory type ====================
export const getBooks = async (req, res) => {
  try {
    const { inventoryType = 'masterlist', page = 1, limit = 50, search = '' } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count first for pagination info
    const totalCount = await getTotalCount(inventoryType, search);
    
    // Get paginated results
    const books = search 
      ? await findAllWithSearch(inventoryType, search, skip, limitNum)
      : await findAllPaginated(inventoryType, skip, limitNum);
    
    const formatted = await Promise.all(books.map(async (b) => {
      // For performance, skip borrow calculations for now - can be added later if needed
      const totalCopies = b.copies || 1;

      return {
        _id: b._id,
        name: b["Book Title"] || b.title || "Untitled",
        author: b["Author"] || b.author || "Unknown Author",
        isbn: b.isbn || "",
        genre: b.genre || "",
        color: b.color || "",
        copies: totalCopies,
        status: "Available", // Simplified for performance
        availableCopies: totalCopies,
        borrowedCopies: 0, // Simplified for performance
        inventoryType: inventoryType,
        // Include all original fields for display
        ...b
      };
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);
    
    res.json({
      data: formatted,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalItems: totalCount,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== Add book to specific inventory type ====================
export const addBook = async (req, res) => {
  try {
    const { inventoryType = 'masterlist', ...bookData } = req.body;
    
    const normalizedData = normalizeInventoryData(bookData, inventoryType);
    
    // Validate required fields (more lenient for Library Collection)
    const title = normalizedData["Book Title"] || normalizedData.title;
    const author = normalizedData["Author"] || normalizedData.author;
    
    // For Library Collection, allow empty title/author if other fields are present
    if (inventoryType !== 'librarycollection' && inventoryType !== 'LibraryCollection') {
      if (!title || !author) {
        return res.status(400).json({ message: "Book Title and Author are required" });
      }
    } else {
      // For Library Collection, at least Course Name should be present
      if (!normalizedData["Course Name"]) {
        return res.status(400).json({ message: "Course Name is required for Library Collection" });
      }
    }

    // Add using centralized models
    const saved = await createItem(inventoryType, normalizedData);

    // Generate QR code for inventory item
    const qrPayload = JSON.stringify({ 
      type: "inventory",
      inventoryItemId: saved._id.toString(),
      inventoryType: inventoryType,
      title: title,
      author: author
    });
    const qrCode = await QRCode.toDataURL(qrPayload);

    res.status(201).json({
      _id: saved._id,
      name: title,
      author: author,
      inventoryType: inventoryType,
      qrCode: qrCode,
      ...(saved.toObject ? saved.toObject() : saved)
    });
  } catch (err) {
    console.error("Error adding book:", err);
    res.status(400).json({ message: err.message });
  }
};

// ==================== Update book in specific inventory ====================
export const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { inventoryType = 'masterlist', ...updateData } = req.body;
    
    const normalizedData = normalizeInventoryData(updateData, inventoryType);

    const updated = await updateItem(inventoryType, id, normalizedData);

    if (!updated) return res.status(404).json({ message: "Book not found" });

    res.json({
      _id: updated._id,
      name: updated["Book Title"] || updated.title,
      author: updated["Author"] || updated.author,
      inventoryType: inventoryType,
      ...updated
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ==================== Delete book from specific inventory ====================
export const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { inventoryType = 'masterlist' } = req.query;
    
    const deleted = await deleteItem(inventoryType, id);

    if (!deleted) return res.status(404).json({ message: "Book not found" });

    // Also remove any borrow records for this inventory item
    await Borrow.deleteMany({ inventoryItemId: id });

    res.json({ message: "Book deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== Delete all books from all inventory types ====================
export const deleteByCategoryAll = async (req, res) => {
  try {
    const { category } = req.query;
    
    if (!category) {
      return res.status(400).json({ message: "Category parameter is required" });
    }

    const categoryMap = {
      'MasterList': 'masterlist',
      'LibraryCollection': 'librarycollection',
      'ListofBookHoldings': 'bookholdings',
      'Ebooks': 'ebooks'
    };

    const normalizedCategory = categoryMap[category] || category.toLowerCase();
    const result = await deleteAllItems(normalizedCategory);
    
    res.json({ 
      message: `Successfully deleted ${result.deletedCount} books from ${category}`,
      deletedCount: result.deletedCount,
      category: category
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteAllBooks = async (req, res) => {
  try {
    const [masterListResult, libraryCollectionResult, bookHoldingsResult, ebooksResult] = await Promise.all([
      deleteAllItems('masterlist'),
      deleteAllItems('librarycollection'),
      deleteAllItems('bookholdings'),
      deleteAllItems('ebooks')
    ]);
    
    const totalDeleted = masterListResult.deletedCount + 
                        libraryCollectionResult.deletedCount + 
                        bookHoldingsResult.deletedCount + 
                        ebooksResult.deletedCount;
    
    // Also clear any borrow records
    await Borrow.deleteMany({});
    
    res.json({ 
      message: `Successfully deleted ${totalDeleted} books from all inventory types`,
      deletedCount: totalDeleted,
      breakdown: {
        masterList: masterListResult.deletedCount,
        libraryCollection: libraryCollectionResult.deletedCount,
        bookHoldings: bookHoldingsResult.deletedCount,
        ebooks: ebooksResult.deletedCount
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// ==================== Book Stats (across all inventory types) ====================
export const getBookStats = async (req, res) => {
  try {
    const inventoryStats = await getAllStats();
    
    // Get borrowed and returned books from Borrow collection
    const borrowedBooks = await Borrow.countDocuments({ returned: false });
    const returnedBooks = await Borrow.countDocuments({ returned: true });
    
    // Calculate totals from inventory stats
    const totalBooks = inventoryStats.totalItems || 0;
    const availableBooks = Math.max(0, totalBooks - borrowedBooks);

    res.json({
      Added: totalBooks,
      Available: availableBooks,
      Borrowed: borrowedBooks,
      Returned: returnedBooks,
      breakdown: inventoryStats.breakdown || {}
    });
  } catch (err) {
    console.error("Error fetching book stats:", err);
    res.status(500).json({ message: err.message });
  }
};

// ==================== Get all inventory types combined ====================
export const getAllInventory = async (req, res) => {
  try {
    const [masterList, libraryCollection, bookHoldings, ebooks] = await Promise.all([
      findAll('masterlist'),
      findAll('librarycollection'),
      findAll('bookholdings'),
      findAll('ebooks')
    ]);

    const formatInventoryItem = (item, type) => ({
      _id: item._id,
      name: item["Book Title"] || item.title || "Untitled",
      author: item["Author"] || item.author || "Unknown Author",
      inventoryType: type,
      ...item
    });

    const allInventory = [
      ...masterList.map(item => formatInventoryItem(item, 'masterlist')),
      ...libraryCollection.map(item => formatInventoryItem(item, 'librarycollection')),
      ...bookHoldings.map(item => formatInventoryItem(item, 'bookholdings')),
      ...ebooks.map(item => formatInventoryItem(item, 'ebooks'))
    ];

    res.json(allInventory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== Set Physical ID for a book ====================
export const setPhysicalId = async (req, res) => {
  try {
    res.status(501).json({ 
      message: "Physical ID functionality not implemented for inventory system. Use direct inventory management instead." 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== Debug: Show all books with their IDs ====================
export const debugBooks = async (req, res) => {
  try {
    // Get all inventory items instead of old Book model
    const allInventory = await getAllInventory(req, res);
    
    res.json({
      message: "Debug functionality updated for inventory system",
      note: "Use /api/books?inventoryType=<type> to view specific inventory types"
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== Cleanup invalid status values ====================
export const cleanupBookStatus = async (req, res) => {
  try {
    res.json({ 
      message: "Status cleanup not needed for inventory system - status is calculated dynamically",
      modifiedCount: 0 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== Bulk Import from CSV ====================
export const bulkImport = async (req, res) => {
  try {
    const { category } = req.query;
    const { data, inventoryData } = req.body;
    
    // Handle both data formats (legacy 'data' and new 'inventoryData')
    const importData = inventoryData || data;

    console.log(`📥 Bulk import request - Category: ${category}, Data count: ${importData?.length}`);
    console.log(`📋 Request body keys:`, Object.keys(req.body));
    console.log(`📋 Sample data:`, importData?.slice(0, 2));

    if (!category || !importData || !Array.isArray(importData)) {
      console.error(`❌ Invalid request - Category: ${category}, Data: ${typeof importData}, IsArray: ${Array.isArray(importData)}`);
      return res.status(400).json({ 
        message: "Missing category or data array" 
      });
    }

    // Process and validate data
    const processedData = importData.map((item, index) => {
      console.log(`📝 Processing item ${index + 1}:`, item);
      // Normalize the data for the specific inventory type
      const normalized = normalizeInventoryData(item, category);
      console.log(`✅ Normalized item ${index + 1}:`, normalized);
      return normalized;
    });

    // Import using the existing createItem function for consistency
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < processedData.length; i++) {
      const itemData = processedData[i];
      try {
        console.log(`🚀 Attempting to create item ${i + 1}:`, itemData);
        const result = await createItem(category, itemData);
        console.log(`✅ Successfully created item ${i + 1}:`, result._id);
        results.push(result);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to import item ${i + 1}:`, error.message);
        console.error(`❌ Item data:`, itemData);
        failCount++;
      }
    }

    res.json({
      message: "Bulk import completed",
      imported: successCount,
      failed: failCount,
      total: importData.length
    });

  } catch (error) {
    console.error("Bulk import error:", error);
    res.status(500).json({ 
      message: "Bulk import failed", 
      error: error.message 
    });
  }
};
