import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    bookNumber: { type: String, unique: true }, // Auto-generated book number like students
    name: { type: String, required: true },
    isbn: { type: String, required: true },
    genre: { type: String, required: true },
    author: { type: String, required: true },
    color: { type: String },
    copies: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["Available", "Borrowed"],
      default: "Available",
    },
    qrCode: { type: String },
    physicalId: { type: String } // Optional: for physical scanner compatibility
  },
  { timestamps: true }
);

export default mongoose.model("Book", bookSchema);
