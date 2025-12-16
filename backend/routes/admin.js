// backend/routes/admin.js
import express from "express";
import { triggerOverdueCheck } from "../services/overdueCheckService.js";
import { sendBorrowConfirmation, sendOverdueNotification, testEmailConfiguration } from "../services/emailService.js";

const router = express.Router();

// Test route to manually trigger overdue check
router.get("/check-overdue", async (req, res) => {
  try {
    await triggerOverdueCheck();
    res.json({ message: "Overdue check completed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error during overdue check", error: error.message });
  }
});

// Test email configuration
router.get("/test-email", async (req, res) => {
  try {
    const isValid = await testEmailConfiguration();
    res.json({ 
      emailConfigured: isValid,
      message: isValid ? "Email service is working" : "Email service not configured"
    });
  } catch (error) {
    res.status(500).json({ message: "Error testing email", error: error.message });
  }
});

// Test borrow confirmation email
router.post("/test-borrow-email", async (req, res) => {
  try {
    const { email, studentName, bookTitle, bookAuthor } = req.body;
    
    if (!email || !studentName || !bookTitle) {
      return res.status(400).json({ message: "Missing required fields: email, studentName, bookTitle" });
    }
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    
    const result = await sendBorrowConfirmation(
      email,
      studentName,
      bookTitle,
      bookAuthor || "Test Author",
      dueDate
    );
    
    res.json({ 
      success: result.success,
      message: result.success ? "Test borrow confirmation email sent" : "Failed to send email",
      error: result.error
    });
  } catch (error) {
    res.status(500).json({ message: "Error sending test email", error: error.message });
  }
});

// Test overdue notification email
router.post("/test-overdue-email", async (req, res) => {
  try {
    const { email, studentName, bookTitle, bookAuthor, daysOverdue, fineAmount } = req.body;
    
    if (!email || !studentName || !bookTitle) {
      return res.status(400).json({ message: "Missing required fields: email, studentName, bookTitle" });
    }
    
    const result = await sendOverdueNotification(
      email,
      studentName,
      bookTitle,
      bookAuthor || "Test Author",
      daysOverdue || 5,
      fineAmount || 50
    );
    
    res.json({ 
      success: result.success,
      message: result.success ? "Test overdue notification email sent" : "Failed to send email",
      error: result.error
    });
  } catch (error) {
    res.status(500).json({ message: "Error sending test email", error: error.message });
  }
});

export default router;