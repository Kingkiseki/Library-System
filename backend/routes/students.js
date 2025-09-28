//routes/students.js
import express from "express";
import { getStudents, addStudent, updateStudent, deleteStudent } from "../controllers/studentController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Protected routes
router.get("/", authMiddleware, getStudents);
router.post("/", authMiddleware, addStudent);
router.put("/:id", authMiddleware, updateStudent);
router.delete("/:id", authMiddleware, deleteStudent);

router.patch("/:id/payfine", async (req, res) => {
    try {
      const student = await Student.findById(req.params.id);
      if (!student) return res.status(404).json({ message: "Student not found" });
  
      student.fine = 0;
      await student.save();
  
      res.json({ message: "Fine removed" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

export default router;
