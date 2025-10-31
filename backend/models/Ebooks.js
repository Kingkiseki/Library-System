//Accession Number Date Received Author Book Title Edition Volume Pages Publisher Copyright Call Number

import mongoose from "mongoose";

const Ebooks = new mongoose.Schema({
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
  Edition: {
    type: String,
    required: true,
  },
  Volume: {
    type: Number,
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
  Copyright: {
    type: String,
    required: true,
  },
  "Call Number": {
    type: String,
    required: true,
  },
});

export default mongoose.model("Ebooks", Ebooks);
