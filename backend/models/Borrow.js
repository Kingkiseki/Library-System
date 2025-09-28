// models/Borrow.js
import mongoose from "mongoose";

const borrowSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    borrowedAt: {
      type: Date,
      default: Date.now,
    },
    returnedAt: {
      type: Date,
      default: null,
    },
    fine: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true } // ✅ this adds createdAt & updatedAt automatically
);

export default mongoose.model("Borrow", borrowSchema);
