// backend/models/Borrow.js
import mongoose from "mongoose";

const borrowSchema = new mongoose.Schema({
  // Support both students and teachers
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: false,
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
    required: false,
  },
  borrowerType: {
    type: String,
    enum: ["student", "teacher"],
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
  fine: {
    type: Number,
    default: 0,
  },
  // Track when last notification was sent to avoid spam
  lastNotificationSent: {
    type: Date,
    default: null,
  },
  // optional: store how it was borrowed (QR / manual)
  method: {
    type: String,
    enum: ["manual", "qr", "scan"],
    default: "manual",
  },
}, { timestamps: true });

export default mongoose.model("Borrow", borrowSchema);
