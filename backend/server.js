import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.js";
// import bookRoutes from "./routes/books.js"; // REMOVED - replaced by inventory system
import studentRoutes from "./routes/students.js";
import borrowRouter from "./routes/borrow.js";
import inventoryRoutes from "./routes/inventory.js";
// Removed legacy book controller imports

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is missing in .env file!");
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/borrow", borrowRouter);
app.use("/api/inventory", inventoryRoutes);

// Legacy books endpoints removed - use /api/inventory/book-holdings instead

// Root endpoint
app.get("/", (req, res) => {
  res.send("Library API is running");
});

// MongoDB connection and server startup
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    console.log("✅ JWT_SECRET loaded:", process.env.JWT_SECRET);
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });
