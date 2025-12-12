// backend/services/emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Email templates
const emailTemplates = {
  borrowConfirmation: (studentName, bookTitle, dueDate, bookAuthor) => ({
    subject: '📚 Book Borrowed Successfully - NTC Library System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c5aa0; margin-bottom: 10px;">📚 NTC Library System</h1>
          <h2 style="color: #333; margin-top: 0;">Book Borrowed Successfully!</h2>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #2c5aa0; margin-top: 0; margin-bottom: 15px;">Borrowing Details:</h3>
          <p style="margin: 8px 0;"><strong>Student:</strong> ${studentName}</p>
          <p style="margin: 8px 0;"><strong>Book Title:</strong> ${bookTitle}</p>
          <p style="margin: 8px 0;"><strong>Author:</strong> ${bookAuthor}</p>
          <p style="margin: 8px 0;"><strong>Borrowed Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p style="margin: 8px 0; color: #d73527;"><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
        </div>
        
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196f3;">
          <p style="margin: 0; color: #1565c0;">
            <strong>⏰ Reminder:</strong> Please return this book by <strong>${dueDate.toLocaleDateString()}</strong> 
            to avoid late fees. Late returns incur a fine of ₱10 per day.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; margin: 0;">Thank you for using NTC Library System!</p>
          <p style="color: #666; margin: 5px 0 0 0; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `
  }),

  overdueNotification: (studentName, bookTitle, bookAuthor, daysOverdue, fineAmount) => ({
    subject: '⚠️ Overdue Book Notice - Fine Applied - NTC Library System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d73527; margin-bottom: 10px;">⚠️ NTC Library System</h1>
          <h2 style="color: #d73527; margin-top: 0;">Overdue Book Notice</h2>
        </div>
        
        <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #d73527;">
          <h3 style="color: #d73527; margin-top: 0; margin-bottom: 15px;">Book Details:</h3>
          <p style="margin: 8px 0;"><strong>Student:</strong> ${studentName}</p>
          <p style="margin: 8px 0;"><strong>Book Title:</strong> ${bookTitle}</p>
          <p style="margin: 8px 0;"><strong>Author:</strong> ${bookAuthor}</p>
          <p style="margin: 8px 0;"><strong>Days Overdue:</strong> ${daysOverdue} days</p>
        </div>
        
        <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ff9800;">
          <h3 style="color: #f57c00; margin-top: 0; margin-bottom: 15px;">💰 Fine Information:</h3>
          <p style="margin: 8px 0; font-size: 18px;"><strong>You have a fine for not returning the book "${bookTitle}"</strong></p>
          <p style="margin: 8px 0; font-size: 20px; color: #d73527;"><strong>Fine Amount: ₱${fineAmount}</strong></p>
          <p style="margin: 8px 0; color: #666; font-size: 14px;">Fine Rate: ₱10 per day overdue</p>
        </div>
        
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50;">
          <p style="margin: 0; color: #2e7d32;">
            <strong>📍 Action Required:</strong> Please return the book as soon as possible to prevent additional fines. 
            Visit the library to return the book and settle your fine.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; margin: 0;">NTC Library System - Automated Notification</p>
          <p style="color: #666; margin: 5px 0 0 0; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `
  })
};

// Send borrow confirmation email
export const sendBorrowConfirmation = async (studentEmail, studentName, bookTitle, bookAuthor, dueDate) => {
  try {
    const transporter = createTransporter();
    const template = emailTemplates.borrowConfirmation(studentName, bookTitle, dueDate, bookAuthor);
    
    const mailOptions = {
      from: `"NTC Library System" <${process.env.EMAIL_USER}>`,
      to: studentEmail,
      subject: template.subject,
      html: template.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Borrow confirmation email sent to ${studentEmail}:`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending borrow confirmation email:', error);
    return { success: false, error: error.message };
  }
};

// Send overdue notification email
export const sendOverdueNotification = async (studentEmail, studentName, bookTitle, bookAuthor, daysOverdue, fineAmount) => {
  try {
    const transporter = createTransporter();
    const template = emailTemplates.overdueNotification(studentName, bookTitle, bookAuthor, daysOverdue, fineAmount);
    
    const mailOptions = {
      from: `"NTC Library System" <${process.env.EMAIL_USER}>`,
      to: studentEmail,
      subject: template.subject,
      html: template.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Overdue notification email sent to ${studentEmail}:`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending overdue notification email:', error);
    return { success: false, error: error.message };
  }
};

// Test email configuration
export const testEmailConfiguration = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email service configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Email service configuration error:', error);
    return false;
  }
};

export default {
  sendBorrowConfirmation,
  sendOverdueNotification,
  testEmailConfiguration
};