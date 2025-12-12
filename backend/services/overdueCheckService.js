// backend/services/overdueCheckService.js
import cron from 'node-cron';
import { Borrow, Student } from '../models/index.js';
import { sendOverdueNotification } from './emailService.js';
import { findById } from '../models/index.js';

// Calculate fine amount (₱10 per day)
const calculateFine = (daysOverdue) => {
  return daysOverdue * 10;
};

// Get inventory item details
const getInventoryItemDetails = async (inventoryType, inventoryItemId) => {
  try {
    const typeMap = {
      'ListofBookHoldings': 'bookholdings',
      'MasterList': 'masterlist',
      'Ebooks': 'ebooks',
      'LibraryCollection': 'librarycollection'
    };
    const serviceType = typeMap[inventoryType] || inventoryType.toLowerCase();
    const item = await findById(serviceType, inventoryItemId);
    
    return {
      title: item?.["Book Title"] || item?.booktitle || item?.title || "Unknown Book",
      author: item?.Author || item?.author || "Unknown Author"
    };
  } catch (error) {
    console.error('Error fetching inventory item details:', error);
    return {
      title: "Unknown Book",
      author: "Unknown Author"
    };
  }
};

// Check for overdue books and send notifications
export const checkOverdueBooks = async () => {
  try {
    console.log('🔍 Checking for overdue books...');
    
    // Get current date
    const currentDate = new Date();
    
    // Find all unreturned books that are overdue
    const overdueBooks = await Borrow.find({
      returned: false,
      dueDate: { $lt: currentDate }
    }).populate('student', 'fullName email');
    
    console.log(`📊 Found ${overdueBooks.length} overdue books`);
    
    for (const borrowRecord of overdueBooks) {
      try {
        // Calculate days overdue
        const daysOverdue = Math.ceil((currentDate - borrowRecord.dueDate) / (1000 * 60 * 60 * 24));
        const currentFine = calculateFine(daysOverdue);
        
        // Update fine in database if it has changed
        if (borrowRecord.fine !== currentFine) {
          borrowRecord.fine = currentFine;
          await borrowRecord.save();
          console.log(`💰 Updated fine for ${borrowRecord.student.fullName}: ₱${currentFine}`);
        }
        
        // Get book details
        const bookDetails = await getInventoryItemDetails(
          borrowRecord.inventoryType, 
          borrowRecord.inventoryItem
        );
        
        // Check if we should send notification (only send once per day to avoid spam)
        const lastNotificationDate = borrowRecord.lastNotificationSent;
        const shouldSendNotification = !lastNotificationDate || 
          (currentDate.toDateString() !== lastNotificationDate.toDateString());
        
        if (shouldSendNotification && borrowRecord.student.email) {
          // Send overdue notification email
          const emailResult = await sendOverdueNotification(
            borrowRecord.student.email,
            borrowRecord.student.fullName,
            bookDetails.title,
            bookDetails.author,
            daysOverdue,
            currentFine
          );
          
          if (emailResult.success) {
            // Update last notification sent date
            borrowRecord.lastNotificationSent = currentDate;
            await borrowRecord.save();
            console.log(`📧 Overdue notification sent to ${borrowRecord.student.fullName} (${borrowRecord.student.email})`);
          } else {
            console.error(`❌ Failed to send notification to ${borrowRecord.student.email}:`, emailResult.error);
          }
        } else if (!borrowRecord.student.email) {
          console.warn(`⚠️ No email address for student: ${borrowRecord.student.fullName}`);
        } else {
          console.log(`📧 Notification already sent today to ${borrowRecord.student.fullName}`);
        }
        
      } catch (error) {
        console.error('❌ Error processing overdue book:', error);
      }
    }
    
    console.log('✅ Overdue book check completed');
  } catch (error) {
    console.error('❌ Error in overdue book check:', error);
  }
};

// Start the scheduled job (runs daily at 9 AM)
export const startOverdueCheckScheduler = () => {
  console.log('🚀 Starting overdue book check scheduler...');
  
  // Schedule to run every day at 9:00 AM
  cron.schedule('0 9 * * *', checkOverdueBooks, {
    scheduled: true,
    timezone: "Asia/Manila"
  });
  
  // For testing purposes, also run every hour during development
  // Remove this in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('🧪 Development mode: Running overdue check every hour');
    cron.schedule('0 * * * *', checkOverdueBooks);
  }
  
  console.log('✅ Overdue check scheduler started successfully');
};

// Manual trigger for testing
export const triggerOverdueCheck = async () => {
  console.log('🔧 Manual overdue check triggered');
  await checkOverdueBooks();
};

export default {
  checkOverdueBooks,
  startOverdueCheckScheduler,
  triggerOverdueCheck
};