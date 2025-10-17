import mongoose from "mongoose";

const MasterListSchema = new mongoose.Schema({
  "Accession Number": {
    type: Number,
    required: true,
  },
  "Date Received": {
    type: Date,
    required: true, 
  },
  Author: {
    type: String,
    required: true,
  },
  "Book Title": {
    type: String,
    required: true,
  },
  "Call Number": {
    type: String,
    required: true,
  },
});

export default mongoose.model("MasterList", MasterListSchema);
