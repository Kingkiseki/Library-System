// backend/models/Teacher.js
import mongoose from "mongoose";

const TeacherSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  teachingLevel: {
    type: String,
    required: true,
    enum: ["Senior High School Teacher (Faculty)", "College Teacher (Faculty)"]
  },
  advisory: {
    type: String,
    required: false,
  },
  contacts: {
    mobile: { type: String, required: false },
    email: { type: String, required: false },
    facebook: { type: String, required: false },
  },
  userType: {
    type: String,
    default: "teacher"
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model("Teacher", TeacherSchema);