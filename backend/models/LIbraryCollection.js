//No. Collection Type Gen.Ed./Prof.Ed. Course Name Book Title Author Publication Year No. of Book Copies

import mongoose from "mongoose";

const LibraryCollection = new mongoose.Schema({
  "School Year Semester": {
    type: String,
    required: false,
    default: ""
  },
  No: {
    type: String,
    required: false,
    default: ""
  },
  "Collection Type": {
    type: String,
    required: false,
    default: ""
  },
  "Gen Ed Prof Ed": {
    type: String,
    required: false,
    default: ""
  },
  "Course Name": {
    type: String,
    required: false,
    default: ""
  },
  "Book Title": {
    type: String,
    required: false,
    default: ""
  },
  Author: {
    type: String,
    required: false,
    default: ""
  },
  "Publication Year": {
    type: String,
    required: false,
    default: ""
  },
  "No of Book Copies": {
    type: String,
    required: false,
    default: ""
  },
});

export default mongoose.model("LibraryCollection", LibraryCollection);
