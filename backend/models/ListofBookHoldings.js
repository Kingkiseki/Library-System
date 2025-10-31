import mongoose from "mongoose";

const ListofBookHoldings = new mongoose.Schema({
  No: {
    type: Number,
    required: true,
  },
  "Collection Type": {
    type: String,
    required: true,
  },
  Classification: {
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
  Volumes: {
    type: Number,
    required: true,
  },
});

export default mongoose.model("ListofBookHoldings", ListofBookHoldings);
