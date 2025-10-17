//Accession Number Date Received Author Book Title Edition Edition Pages Publisher Copyright Call Number

import mongoose from "mongoose";

const Ebooks = new mongoose.Schema({
  "Accession Number": {
    type: Number,
    required: true,
  },
  "Date Received": {
    type: String,
    required: true, // e.g., "Fiction", "Reference", "Thesis"
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
    required: true,
  },
  Pages: {
    type: Number,
    required: true,
  },
  Publisher: {
    type: String,
    required: true,
  },
  "Call Number": {
    type: String,
    required: true,
  },
});

export default mongoose.model("Ebooks", Ebooks);
