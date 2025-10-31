// controllers/studentController.js
import Student from "../models/Student.js";
import QRCode from "qrcode";

// ==================== Get all students ====================
export const getStudents = async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== Add student (with auto studentNumber + QR using _id) ====================
export const addStudent = async (req, res) => {
  try {
    const { fullName, year, adviser, contacts, mobile, email, facebook } = req.body;
    console.log("Adding student with data:", req.body);
    
    const currentYear = new Date().getFullYear();

    const lastStudent = await Student.findOne({
      studentNumber: new RegExp(`^${currentYear}-`)
    }).sort({ createdAt: -1 });

    let nextNumber = 1;
    if (lastStudent) {
      const lastNumber = parseInt(lastStudent.studentNumber.split("-")[1]);
      nextNumber = lastNumber + 1;
    }

    const studentNumber = `${currentYear}-${String(nextNumber).padStart(4, "0")}`;

    // Handle both nested contacts object and flat fields for backward compatibility
    let studentContacts = contacts;
    if (!contacts && (mobile || email || facebook)) {
      studentContacts = { mobile, email, facebook };
    }

    const newStudent = new Student({
      studentNumber,
      fullName,
      year,
      adviser,
      contacts: studentContacts,
    });

    await newStudent.save();

    // ✅ QR encodes student data with multiple identifiers
    const qrPayload = JSON.stringify({ 
      studentId: newStudent._id.toString(),
      studentNumber: newStudent.studentNumber,
      type: "student"
    });
    const qrCode = await QRCode.toDataURL(qrPayload);

    newStudent.qrCode = qrCode;
    await newStudent.save();

    res.status(201).json(newStudent);
  } catch (err) {
    console.error("Error adding student:", err);
    res.status(400).json({ message: err.message });
  }
};

// ==================== Update student ====================
export const updateStudent = async (req, res) => {
  try {
    const { fullName, year, adviser, contacts, mobile, email, facebook } = req.body;
    console.log("Updating student with data:", req.body);
    
    // Handle both nested contacts object and flat fields for backward compatibility
    let updateData = { fullName, year, adviser };
    if (contacts) {
      updateData.contacts = contacts;
    } else if (mobile || email || facebook) {
      updateData.contacts = { mobile, email, facebook };
    }
    
    const updated = await Student.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Student not found" });
    console.log("Student updated successfully:", updated);
    res.json(updated);
  } catch (err) {
    console.error("Error updating student:", err);
    res.status(400).json({ message: err.message });
  }
};

// ==================== Delete student ====================
export const deleteStudent = async (req, res) => {
  try {
    const deleted = await Student.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Student not found" });
    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== Delete all students (for fresh start) ====================
export const deleteAllStudents = async (req, res) => {
  try {
    const result = await Student.deleteMany({});
    res.json({ 
      message: `Successfully deleted ${result.deletedCount} students`,
      deletedCount: result.deletedCount 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== Get student by studentNumber ====================
export const getStudentByNumber = async (req, res) => {
  try {
    const { studentNumber } = req.params;
    
    console.log("🔍 Looking for student with number:", studentNumber);
    console.log("🔍 Student number length:", studentNumber?.length);
    console.log("🔍 Student number ASCII:", studentNumber?.split('').map(c => c.charCodeAt(0)));
    
    // Debug: log all student numbers in database
    const allStudents = await Student.find({}, 'studentNumber').lean();
    console.log("📚 All students in database:", allStudents.map(s => ({
      studentNumber: s.studentNumber,
      length: s.studentNumber.length,
      ascii: s.studentNumber?.split('').map(c => c.charCodeAt(0))
    })));

    const student = await Student.findOne({ studentNumber })
      .populate({ path: "borrowedBooks.book", select: "name author bookNumber isbn" })
      .lean();

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    let totalFine = 0;
    const borrowedBooks = student.borrowedBooks.map((b) => {
      let fine = 0;
      if (b.borrowedAt) {
        const daysBorrowed = Math.floor(
          (Date.now() - new Date(b.borrowedAt)) / (1000 * 60 * 60 * 24)
        );
        if (daysBorrowed > 7) fine = (daysBorrowed - 7) * 5;
      }
      totalFine += fine;

      return { _id: b._id, book: b.book, borrowedAt: b.borrowedAt, fine };
    });

    res.json({
      student: {
        _id: student._id,
        studentNumber: student.studentNumber,
        fullName: student.fullName,
        year: student.year,
        adviser: student.adviser,
        contacts: student.contacts,
        qrCode: student.qrCode,
      },
      borrowedBooks,
      totalFine,
    });
  } catch (err) {
    console.error("Error in getStudentByNumber:", err);
    res.status(500).json({ message: err.message });
  }
};

// ==================== Get student by ID ====================
export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id)
      .populate({ path: "borrowedBooks.book", select: "name author bookNumber isbn" })
      .lean();

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    let totalFine = 0;
    const borrowedBooks = student.borrowedBooks.map((b) => {
      let fine = 0;
      if (b.borrowedAt) {
        const daysBorrowed = Math.floor(
          (Date.now() - new Date(b.borrowedAt)) / (1000 * 60 * 60 * 24)
        );
        if (daysBorrowed > 7) fine = (daysBorrowed - 7) * 5;
      }
      totalFine += fine;

      return { _id: b._id, book: b.book, borrowedAt: b.borrowedAt, fine };
    });

    res.json({
      student: {
        _id: student._id,
        studentNumber: student.studentNumber,
        fullName: student.fullName,
        year: student.year,
        adviser: student.adviser,
        contacts: student.contacts,
        qrCode: student.qrCode,
      },
      borrowedBooks,
      totalFine,
    });
  } catch (err) {
    console.error("Error in getStudentById:", err);
    res.status(500).json({ message: err.message });
  }
};

// ==================== Pay fine by studentNumber ====================
export const payFineByNumber = async (req, res) => {
  try {
    const { studentNumber } = req.params;

    const student = await Student.findOne({ studentNumber });
    if (!student) return res.status(404).json({ message: "Student not found" });

    // ✅ Reset fines by updating borrowedAt to "now"
    student.borrowedBooks = student.borrowedBooks.map((b) => ({
      ...b,
      borrowedAt: new Date(), // reset timer so fine recalculates to 0
    }));

    await student.save();

    res.json({ message: "Fine marked as paid", student });
  } catch (err) {
    console.error("Error in payFineByNumber:", err);
    res.status(500).json({ message: err.message });
  }
};
// ==================== Scan student QR (by _id inside QR) ====================
export const scanStudentQR = async (req, res) => {
  try {
    const { studentId } = req.body; // extracted from QR payload

    const student = await Student.findById(studentId)
      .populate({ path: "borrowedBooks.book", select: "title author" })
      .lean();

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  } catch (err) {
    console.error("Error in scanStudentQR:", err);
    res.status(500).json({ message: err.message });
  }
};

// ==================== Debug: Show all students with their info ====================
export const debugStudents = async (req, res) => {
  try {
    const students = await Student.find({}, 'fullName studentNumber _id').lean();
    
    console.log("=== DEBUG: All Students in Database ===");
    students.forEach(student => {
      console.log(`Student: ${student.fullName}`);
      console.log(`  - MongoDB ID: ${student._id}`);
      console.log(`  - Student Number: ${student.studentNumber}`);
      console.log('---');
    });
    
    res.json({
      message: `Found ${students.length} students`,
      students: students.map(student => ({
        name: student.fullName,
        mongoId: student._id,
        studentNumber: student.studentNumber
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================== Set Physical ID for a student ====================
export const setStudentPhysicalId = async (req, res) => {
  try {
    const { studentId, physicalId } = req.body;
    
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    
    // Add or update physicalId field
    student.physicalId = physicalId;
    await student.save();
    
    res.json({ 
      message: `Physical ID ${physicalId} assigned to "${student.fullName}"`,
      student: {
        _id: student._id,
        fullName: student.fullName,
        studentNumber: student.studentNumber,
        physicalId: student.physicalId
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


