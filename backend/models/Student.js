import mongoose from "mongoose";

const borrowedBookSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
  borrowedAt: { type: Date, default: Date.now }
});

const studentSchema = new mongoose.Schema(
  {
    studentNumber: { type: String, required: true, unique: true }, // 🔥 incremental ID
    fullName: { type: String, required: true },
    year: { type: String },
    adviser: { type: String },
    contacts: {
      mobile: { type: String },
      email: { type: String },
      facebook: { type: String }
    },
    qrCode: { type: String },
    physicalId: { type: String }, // For physical scanner compatibility
    borrowedBooks: [borrowedBookSchema],
    finesPaid: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// ✅ keep unique index for studentNumber
studentSchema.set("autoIndex", true);

export default mongoose.model("Student", studentSchema);
