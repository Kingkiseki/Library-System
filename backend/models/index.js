// backend/models/index.js
// Single source of truth for all models to avoid conflicts

import MasterList from "./MasterList.js";
import LibraryCollection from "./LibraryCollection.js";
import ListofBookHoldings from "./ListofBookHoldings.js";
import Ebooks from "./Ebooks.js";
import Borrow from "./Borrow.js";
import Student from "./Student.js";
import Teacher from "./Teacher.js";
import User from "./User.js";

// Export all models from a single location
export {
  MasterList,
  LibraryCollection,
  ListofBookHoldings,
  Ebooks,
  Borrow,
  Student,
  Teacher,
  User
};

// Helper function to get inventory model by type
export const getInventoryModel = (type) => {
  switch (type) {
    case 'masterlist':
    case 'MasterList':
      return MasterList;
    case 'librarycollection':
    case 'LibraryCollection':
      return LibraryCollection;
    case 'bookholdings':
    case 'ListofBookHoldings':
      return ListofBookHoldings;
    case 'ebooks':
    case 'Ebooks':
      return Ebooks;
    default:
      throw new Error(`Unknown inventory type: ${type}`);
  }
};

// CRUD operations using the centralized models
export const findAll = async (inventoryType) => {
  const Model = getInventoryModel(inventoryType);
  return await Model.find().lean();
};

export const findById = async (inventoryType, id) => {
  const Model = getInventoryModel(inventoryType);
  return await Model.findById(id).lean();
};

export const createItem = async (inventoryType, data) => {
  const Model = getInventoryModel(inventoryType);
  const item = new Model(data);
  return await item.save();
};

export const updateItem = async (inventoryType, id, data) => {
  const Model = getInventoryModel(inventoryType);
  return await Model.findByIdAndUpdate(id, data, { new: true }).lean();
};

export const deleteItem = async (inventoryType, id) => {
  const Model = getInventoryModel(inventoryType);
  return await Model.findByIdAndDelete(id).lean();
};

export const deleteAllItems = async (inventoryType) => {
  const Model = getInventoryModel(inventoryType);
  return await Model.deleteMany({});
};

export const countItems = async (inventoryType) => {
  const Model = getInventoryModel(inventoryType);
  return await Model.countDocuments();
};

// Pagination and search functions for performance
export const findAllPaginated = async (inventoryType, skip = 0, limit = 50) => {
  const Model = getInventoryModel(inventoryType);
  return await Model.find().skip(skip).limit(limit).lean();
};

export const findAllWithSearch = async (inventoryType, searchTerm, skip = 0, limit = 50) => {
  const Model = getInventoryModel(inventoryType);
  const searchRegex = new RegExp(searchTerm, 'i');
  
  // Build search query based on inventory type
  let searchQuery;
  
  switch (inventoryType) {
    case 'masterlist':
    case 'MasterList':
      searchQuery = {
        $or: [
          { "Book Title": searchRegex },
          { "Author": searchRegex },
          { "Publisher": searchRegex },
          { "Call Number": searchRegex },
          { "Accession Number": searchRegex },
          { "Edition": searchRegex },
          { "Copyright": searchRegex }
        ]
      };
      break;
      
    case 'librarycollection':
    case 'LibraryCollection':
      searchQuery = {
        $or: [
          { "Book Title": searchRegex },
          { "Author": searchRegex },
          { "Course Name": searchRegex },
          { "School Year Semester": searchRegex },
          { "Gen Ed Prof Ed": searchRegex },
          { "Collection Type": searchRegex },
          { "Publication Year": searchRegex },
          { "No": searchRegex }
        ]
      };
      break;
      
    case 'bookholdings':
    case 'ListofBookHoldings':
      searchQuery = {
        $or: [
          { "Book Title": searchRegex },
          { "Author": searchRegex },
          { "Course Name": searchRegex },
          { "Collection Type": searchRegex },
          { "Classification": searchRegex },
          { "Publication Year": searchRegex },
          { "No": searchRegex }
        ]
      };
      break;
      
    case 'ebooks':
    case 'Ebooks':
      searchQuery = {
        $or: [
          { "Book Title": searchRegex },
          { "Author": searchRegex },
          { "Publisher": searchRegex },
          { "Call Number": searchRegex },
          { "Accession Number": searchRegex },
          { "Edition": searchRegex },
          { "Copyright": searchRegex }
        ]
      };
      break;
      
    default:
      searchQuery = {
        $or: [
          { "Book Title": searchRegex },
          { "Author": searchRegex }
        ]
      };
  }
  
  return await Model.find(searchQuery).skip(skip).limit(limit).lean();
};

export const getTotalCount = async (inventoryType, searchTerm = '') => {
  const Model = getInventoryModel(inventoryType);
  
  if (!searchTerm) {
    return await Model.countDocuments();
  }
  
  const searchRegex = new RegExp(searchTerm, 'i');
  
  // Build search query based on inventory type (same logic as findAllWithSearch)
  let searchQuery;
  
  switch (inventoryType) {
    case 'masterlist':
    case 'MasterList':
      searchQuery = {
        $or: [
          { "Book Title": searchRegex },
          { "Author": searchRegex },
          { "Publisher": searchRegex },
          { "Call Number": searchRegex },
          { "Accession Number": searchRegex },
          { "Edition": searchRegex },
          { "Copyright": searchRegex }
        ]
      };
      break;
      
    case 'librarycollection':
    case 'LibraryCollection':
      searchQuery = {
        $or: [
          { "Book Title": searchRegex },
          { "Author": searchRegex },
          { "Course Name": searchRegex },
          { "School Year Semester": searchRegex },
          { "Gen Ed Prof Ed": searchRegex },
          { "Collection Type": searchRegex },
          { "Publication Year": searchRegex },
          { "No": searchRegex }
        ]
      };
      break;
      
    case 'bookholdings':
    case 'ListofBookHoldings':
      searchQuery = {
        $or: [
          { "Book Title": searchRegex },
          { "Author": searchRegex },
          { "Course Name": searchRegex },
          { "Collection Type": searchRegex },
          { "Classification": searchRegex },
          { "Publication Year": searchRegex },
          { "No": searchRegex }
        ]
      };
      break;
      
    case 'ebooks':
    case 'Ebooks':
      searchQuery = {
        $or: [
          { "Book Title": searchRegex },
          { "Author": searchRegex },
          { "Publisher": searchRegex },
          { "Call Number": searchRegex },
          { "Accession Number": searchRegex },
          { "Edition": searchRegex },
          { "Copyright": searchRegex }
        ]
      };
      break;
      
    default:
      searchQuery = {
        $or: [
          { "Book Title": searchRegex },
          { "Author": searchRegex }
        ]
      };
  }
  
  return await Model.countDocuments(searchQuery);
};

// Get stats across all inventory types
export const getAllStats = async () => {
  const [masterListCount, libraryCollectionCount, bookHoldingsCount, ebooksCount] = await Promise.all([
    MasterList.countDocuments(),
    LibraryCollection.countDocuments(),
    ListofBookHoldings.countDocuments(),
    Ebooks.countDocuments()
  ]);

  return {
    totalItems: masterListCount + libraryCollectionCount + bookHoldingsCount + ebooksCount,
    breakdown: {
      masterList: masterListCount,
      libraryCollection: libraryCollectionCount,
      bookHoldings: bookHoldingsCount,
      ebooks: ebooksCount
    }
  };
};