//Accession Number Date Received Author Book Title Edition Volume Pages Publisher Copyright Call Number

import mongoose from "mongoose";

const Ebooks = new mongoose.Schema({
  "Accession Number": {
    type: String,
    required: false,
    default: ""
  },
  "Date Received": {
    type: String,
    required: false,
    default: ""
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
    default: ""
  },
  Volume: {
    type: String,
    required: false,
    default: ""
  },
  Pages: {
    type: String,
    required: false,
    default: ""
  },
  Publisher: {
    type: String,
    required: false,
    default: ""
  },
  Copyright: {
    type: String,
    required: false,
    default: ""
  },
  "Call Number": {
    type: String,
    required: false,
    default: ""
  },
});

export default mongoose.model("Ebooks", Ebooks);
