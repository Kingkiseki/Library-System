// backend/models/Borrow.js
import mongoose from "mongoose";

const borrowSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  // Support for different inventory types
  inventoryItem: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  inventoryType: {
    type: String,
    enum: ["ListofBookHoldings", "MasterList", "Ebooks", "LibraryCollection"],
    required: true,
  },
  borrowedAt: {
    type: Date,
    default: Date.now,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  returnedAt: {
    type: Date,
    default: null,
  },
  returned: {
    type: Boolean,
    default: false,
  },
  finePaid: {
    type: Number,
    default: 0,
  },
  fineCalculated: {
    type: Number,
    default: 0,
  },
  // optional: store how it was borrowed (QR / manual)
  method: {
    type: String,
    enum: ["manual", "qr", "scan"],
    default: "manual",
  },
}, { timestamps: true });

export default mongoose.model("Borrow", borrowSchema);
