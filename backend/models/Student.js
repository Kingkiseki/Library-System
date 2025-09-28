import mongoose from "mongoose";

const borrowedBookSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
  borrowedAt: { type: Date, default: Date.now }
});

const studentSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  year: { type: String },
  adviser: { type: String },
  contacts: {
    mobile: { type: String },
    email: { type: String },
    facebook: { type: String }
  },
  qrCode: { type: String },
  borrowedBooks: [borrowedBookSchema],
  finesPaid: { type: Boolean, default: false }
}, { timestamps: true });

// Prevent creation of indexes that don’t exist in schema
studentSchema.set('autoIndex', false);

export default mongoose.model("Student", studentSchema);
