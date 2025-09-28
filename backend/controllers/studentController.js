// backend/controllers/studentController.js
import Student from "../models/Student.js";
import QRCode from "qrcode";

// ==================== Get all students ====================
export const getStudents = async (req, res) => {
  try {
    const students = await Student.find();

    const formatted = students.map((s) => ({
      _id: s._id,
      studentNumber: s.studentNumber,
      fullName: s.fullName,
      year: s.year,
      adviser: s.adviser,
      mobile: s.contacts?.mobile || "",
      email: s.contacts?.email || "",
      facebook: s.contacts?.facebook || "",
      qrCode: s.qrCode || "",
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== Add student (with QR and studentNumber) ====================
export const addStudent = async (req, res) => {
  try {
    const { fullName, year, adviser, mobile, email, facebook } = req.body;

    // Generate unique studentNumber
    const studentNumber = "S" + Date.now();

    // Generate unique QR code data
    const qrData = `${fullName}-${Date.now()}`;
    const qrCode = await QRCode.toDataURL(qrData);

    const student = new Student({
      studentNumber,
      fullName,
      year,
      adviser,
      contacts: { mobile, email, facebook },
      qrCode,
    });

    const saved = await student.save();

    res.status(201).json({
      _id: saved._id,
      studentNumber: saved.studentNumber,
      fullName: saved.fullName,
      year: saved.year,
      adviser: saved.adviser,
      mobile: saved.contacts.mobile,
      email: saved.contacts.email,
      facebook: saved.contacts.facebook,
      qrCode: saved.qrCode,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ==================== Update student ====================
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, year, adviser, mobile, email, facebook } = req.body;

    const updated = await Student.findByIdAndUpdate(
      id,
      {
        fullName,
        year,
        adviser,
        contacts: { mobile, email, facebook },
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Student not found" });

    res.json({
      _id: updated._id,
      studentNumber: updated.studentNumber,
      fullName: updated.fullName,
      year: updated.year,
      adviser: updated.adviser,
      mobile: updated.contacts.mobile,
      email: updated.contacts.email,
      facebook: updated.contacts.facebook,
      qrCode: updated.qrCode,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ==================== Delete student ====================
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Student.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ message: "Student not found" });

    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
