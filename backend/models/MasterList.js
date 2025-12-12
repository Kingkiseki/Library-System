import mongoose from "mongoose";

const MasterListSchema = new mongoose.Schema({
  "Accession Number": {
    type: String,
    required: true,
  },
  "Date Received": {
    type: Date,
    required: false,
    default: Date.now
  },
  Author: {
    type: String,
    required: true,
  },
  "Book Title": {
    type: String,
    required: true,
  },
  Edition: {
    type: String,
    required: false,
    default: "1st"
  },
  Volume: {
    type: String,
    required: false,
    default: "1"
  },
  Pages: {
    type: String,
    required: false,
    default: "N/A"
  },
  "Source of Fund": {
    type: String,
    required: false,
  },
  "Cost Price": {
    type: String,
    required: false,
  },
  Publisher: {
    type: String,
    required: false,
    default: "Unknown"
  },
  Copyright: {
    type: String,
    required: false,
  },
  Reprint: {
    type: String,
    required: false,
  },
  Status: {
    type: String,
    required: false,
    default: "Available"
  },
  "Call Number": {
    type: String,
    required: false,
    default: function() {
      return `REF${this["Accession Number"] || Math.floor(Math.random() * 10000)}`;
    }
  },
});

export default mongoose.model("MasterList", MasterListSchema);
