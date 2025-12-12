// backend/routes/teachers.js
import express from "express";
import Teacher from "../models/Teacher.js";

const router = express.Router();

// Get all teachers
router.get("/", async (req, res) => {
  try {
    const teachers = await Teacher.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(teachers);
  } catch (error) {
    console.error("Error fetching teachers:", error);
    res.status(500).json({ message: "Error fetching teachers", error: error.message });
  }
});

// Get teacher by ID
router.get("/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    res.json(teacher);
  } catch (error) {
    console.error("Error fetching teacher:", error);
    res.status(500).json({ message: "Error fetching teacher", error: error.message });
  }
});

// Create new teacher
router.post("/", async (req, res) => {
  try {
    const { fullName, teachingLevel, advisory, contacts } = req.body;

    // Validate required fields
    if (!fullName || !teachingLevel) {
      return res.status(400).json({ 
        message: "Missing required fields: fullName and teachingLevel are required" 
      });
    }

    const newTeacher = new Teacher({
      fullName,
      teachingLevel,
      advisory: advisory || "",
      contacts: contacts || { mobile: "", email: "", facebook: "" },
      userType: "teacher"
    });

    const savedTeacher = await newTeacher.save();
    res.status(201).json(savedTeacher);
  } catch (error) {
    console.error("Error creating teacher:", error);
    res.status(500).json({ message: "Error creating teacher", error: error.message });
  }
});

// Update teacher
router.put("/:id", async (req, res) => {
  try {
    const { fullName, teachingLevel, advisory, contacts } = req.body;

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      {
        fullName,
        teachingLevel,
        advisory,
        contacts
      },
      { new: true, runValidators: true }
    );

    if (!updatedTeacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.json(updatedTeacher);
  } catch (error) {
    console.error("Error updating teacher:", error);
    res.status(500).json({ message: "Error updating teacher", error: error.message });
  }
});

// Delete teacher (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const deletedTeacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!deletedTeacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.json({ message: "Teacher deleted successfully", teacher: deletedTeacher });
  } catch (error) {
    console.error("Error deleting teacher:", error);
    res.status(500).json({ message: "Error deleting teacher", error: error.message });
  }
});

// Search teachers
router.get("/search/:query", async (req, res) => {
  try {
    const { query } = req.params;
    const teachers = await Teacher.find({
      isActive: true,
      $or: [
        { fullName: { $regex: query, $options: "i" } },
        { teachingLevel: { $regex: query, $options: "i" } },
        { advisory: { $regex: query, $options: "i" } }
      ]
    }).sort({ createdAt: -1 });

    res.json(teachers);
  } catch (error) {
    console.error("Error searching teachers:", error);
    res.status(500).json({ message: "Error searching teachers", error: error.message });
  }
});

export default router;