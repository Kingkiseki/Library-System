import mongoose from "mongoose";

const ListofBookHoldings = new mongoose.Schema({
  no: {
    type: Number,
    required: true,
  },
  coltype: {
    type: String,
    required: true, // e.g., "Fiction", "Reference", "Thesis"
  },
  classification: {
    type: String,
    required: true,
  },
  booktitle: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
  pubyear: {
    type: Number,
    required: true,
  },
  volumes: {
    type: Number,
    required: true,
  },
});

export default mongoose.model("ListofBookHoldings", ListofBookHoldings);
