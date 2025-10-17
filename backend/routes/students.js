// routes/students.js
import express from "express";
import QRCode from "qrcode";
import Student from "../models/Student.js";
import {
  getStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  deleteAllStudents,
  getStudentByNumber,
  getStudentById,
  payFineByNumber,
  scanStudentQR,
  debugStudents,
  setStudentPhysicalId,
} from "../controllers/studentController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// ✅ Protected routes (temporarily removed auth for debugging)
router.get("/", getStudents);
router.post("/", authMiddleware, addStudent);
router.put("/:id", authMiddleware, updateStudent);
router.delete("/:id", authMiddleware, deleteStudent);

// ✅ Get student by studentNumber
router.get("/number/:studentNumber", authMiddleware, getStudentByNumber);

// ✅ Get student by ID
router.get("/:id", authMiddleware, getStudentById);

// ✅ Clear student fines
router.patch("/number/:studentNumber/payfine", authMiddleware, payFineByNumber);

// ✅ Scan QR (payload contains { studentId })
router.post("/scan", authMiddleware, scanStudentQR);

// ✅ Delete all students (for fresh start)
router.delete("/all", authMiddleware, deleteAllStudents);

// ✅ Debug endpoint to show all student info (no auth for debugging)
router.get("/debug", debugStudents);

// ✅ Set physical ID for a student (no auth for debugging)
router.post("/set-physical-id", setStudentPhysicalId);

// ✅ Test physicalId lookup (debugging)
router.get("/test-physical/:physicalId", async (req, res) => {
  try {
    const { physicalId } = req.params;
    console.log("Testing physicalId lookup for:", physicalId);
    console.log("Type of physicalId:", typeof physicalId);
    
    const students = await Student.find();
    console.log("All students:", students.map(s => ({ 
      name: s.fullName, 
      physicalId: s.physicalId, 
      type: typeof s.physicalId,
      matches: s.physicalId === physicalId,
      strictEquals: s.physicalId === physicalId,
      loosEquals: s.physicalId == physicalId
    })));
    
    const student = students.find(s => s.physicalId === physicalId);
    
    if (student) {
      res.json({ success: true, student });
    } else {
      res.json({ success: false, message: "No student found" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
