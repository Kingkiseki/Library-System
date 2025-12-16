import express from "express";
import MasterList from "../models/MasterList.js";
import LibraryCollection from "../models/LIbraryCollection.js";
import ListofBookHoldings from "../models/ListofBookHoldings.js";
import Ebooks from "../models/Ebooks.js";

const router = express.Router();

// Model mapping
const getModel = (category) => {
  const models = {
    MasterList: MasterList,
    LibraryCollection: LibraryCollection, 
    ListofBookHoldings: ListofBookHoldings,
    Ebooks: Ebooks
  };
  return models[category];
};

// Bulk import endpoint
router.post("/import", async (req, res) => {
  try {
    const { category } = req.query;
    const { data } = req.body;

    if (!category || !data || !Array.isArray(data)) {
      return res.status(400).json({ 
        message: "Missing category or data array" 
      });
    }

    const Model = getModel(category);
    if (!Model) {
      return res.status(400).json({ 
        message: "Invalid category" 
      });
    }

    // Process and validate data
    const processedData = data.map(item => {
      // Convert string numbers to actual numbers where needed
      const processed = { ...item };
      
      // Convert specific fields to numbers based on category
      if (category === 'MasterList' || category === 'Ebooks') {
        if (processed['Accession Number']) {
          processed['Accession Number'] = parseInt(processed['Accession Number']);
        }
        if (processed['Volume']) {
          processed['Volume'] = parseInt(processed['Volume']);
        }
        if (processed['Pages']) {
          processed['Pages'] = parseInt(processed['Pages']);
        }
      }
      
      if (category === 'LibraryCollection') {
        if (processed['Publication Year']) {
          processed['Publication Year'] = parseInt(processed['Publication Year']);
        }
        if (processed['No of Book Copies']) {
          processed['No of Book Copies'] = parseInt(processed['No of Book Copies']);
        }
      }
      
      if (category === 'ListofBookHoldings') {
        if (processed['Publication Year']) {
          processed['Publication Year'] = parseInt(processed['Publication Year']);
        }
        if (processed['Volumes']) {
          processed['Volumes'] = parseInt(processed['Volumes']);
        }
      }

      // Convert date fields
      if (processed['Date Received']) {
        processed['Date Received'] = new Date(processed['Date Received']);
      }

      return processed;
    });

    // Bulk insert
    const result = await Model.insertMany(processedData, { 
      ordered: false // Continue inserting even if some fail
    });

    res.json({
      message: "Import completed successfully",
      imported: result.length,
      total: data.length
    });

  } catch (error) {
    console.error("Import error:", error);
    
    if (error.code === 11000) {
      // Duplicate key error
      const imported = error.result ? error.result.insertedCount : 0;
      res.status(200).json({
        message: `Import completed with ${error.writeErrors?.length || 0} duplicates skipped`,
        imported: imported,
        total: req.body.data.length,
        duplicates: error.writeErrors?.length || 0
      });
    } else {
      res.status(500).json({ 
        message: "Import failed", 
        error: error.message 
      });
    }
  }
});

export default router;