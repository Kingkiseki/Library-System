//No. Type Journal Name Publisher Publication Frequency Regular Subscription Supporting Documents Link

import mongoose from "mongoose";

const LibraryCollection = new mongoose.Schema({
  no: {
    type: Number,
    required: true,
  },
  Type: {
    type: String,
    required: true,
  },
  "Name Publisher": {
    type: String,
    required: true,
  },
  "Publication": {
    type: String,
    required: true,
  },
  "Frequency": {
    type: String,
    required: true,
  },
  "Regular Subscription": {
    type: Number,
    required: true,
  },
  "Supporting Documents Link": {
    type: String,
    required: true,
  },
});

export default mongoose.model("LibraryCollection", LibraryCollection);
