import mongoose from "mongoose";

const ListofBookHoldings = new mongoose.Schema({
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
  Classification: {
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
  Volumes: {
    type: String,
    required: false,
    default: ""
  },
});

export default mongoose.model("ListofBookHoldings", ListofBookHoldings);
