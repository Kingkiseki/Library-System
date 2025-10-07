// Quick script to assign physical ID to a book
// Usage: node scripts/assignPhysicalId.js "Book Name" "PhysicalId"

import mongoose from "mongoose";
import Book from "../models/Book.js";
import dotenv from "dotenv";

dotenv.config();

const assignPhysicalId = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("📚 Connected to MongoDB");

    const args = process.argv.slice(2);
    if (args.length < 2) {
      console.log("Usage: node assignPhysicalId.js \"Book Name\" \"PhysicalId\"");
      console.log("Example: node assignPhysicalId.js \"Sample Book\" \"68255572507775\"");
      process.exit(1);
    }

    const [bookName, physicalId] = args;

    // Find book by partial name match
    const book = await Book.findOne({ 
      name: { $regex: bookName, $options: 'i' } 
    });

    if (!book) {
      console.log(`❌ No book found matching "${bookName}"`);
      
      // Show available books
      const allBooks = await Book.find({}, 'name bookNumber physicalId').limit(10);
      console.log("\n📖 Available books:");
      allBooks.forEach(b => {
        console.log(`  - "${b.name}" (${b.bookNumber}) ${b.physicalId ? `[Physical: ${b.physicalId}]` : '[No Physical ID]'}`);
      });
      
      process.exit(1);
    }

    // Check if physical ID is already used
    const existing = await Book.findOne({ physicalId });
    if (existing && existing._id.toString() !== book._id.toString()) {
      console.log(`❌ Physical ID ${physicalId} is already assigned to "${existing.name}"`);
      process.exit(1);
    }

    // Assign the physical ID
    book.physicalId = physicalId;
    await book.save();

    console.log(`✅ Successfully assigned physical ID "${physicalId}" to book "${book.name}"`);
    console.log(`📋 Book Details:`);
    console.log(`   - Name: ${book.name}`);
    console.log(`   - Book Number: ${book.bookNumber}`);
    console.log(`   - Physical ID: ${book.physicalId}`);
    console.log(`   - Status: ${book.status}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

assignPhysicalId();