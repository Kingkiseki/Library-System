//No. Collection Type Gen.Ed./Prof.Ed. Course Name Book Title Author Publication Year No. of Book Copies

import mongoose from "mongoose";

const LibraryCollection = new mongoose.Schema({
  No: {
    type: Number,
    required: true,
  },
  "Collection Type": {
    type: String,
    required: true,
  },
  "Gen.Ed./Prof.Ed.": {
    type: String,
    required: true,
  },
  "Course Name": {
    type: String,
    required: true,
  },
  "Book Title": {
    type: String,
    required: true,
  },
  Author: {
    type: String,
    required: true,
  },
  "Publication Year": {
    type: Number,
    required: true,
  },
  "No. of Book Copies": {
    type: Number,
    required: true,
  },
});

export default mongoose.model("LibraryCollection", LibraryCollection);
