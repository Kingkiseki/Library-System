import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import bookRoutes from "./routes/books.js"; // RESTORED
import studentRoutes from "./routes/students.js";
import teacherRoutes from "./routes/teachers.js";
import borrowRouter from "./routes/borrow.js";
import adminRoutes from "./routes/admin.js";
import inventoryRoutes from "./routes/inventory.js";
import { startOverdueCheckScheduler } from "./services/overdueCheckService.js";
import { testEmailConfiguration } from "./services/emailService.js";

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Basic route for testing
app.get("/", (req, res) => {
  res.json({ message: "Library API is running" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes); // RESTORED
app.use("/api/students", studentRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/borrow", borrowRouter); // RESTORED - now uses centralized models
app.use("/api/admin", adminRoutes); // Admin routes for testing email notifications
app.use("/api/inventory", inventoryRoutes); // Inventory management routes

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
  .then(async () => {
    console.log("✅ MongoDB connected successfully");
    console.log("✅ JWT_SECRET loaded:", process.env.JWT_SECRET);
    
    // Test email configuration (non-blocking)
    try {
      const emailConfigValid = await testEmailConfiguration();
      if (emailConfigValid) {
        console.log("✅ Email service ready");
      } else {
        console.log("⚠️ Email service not configured - notifications will be disabled");
      }
    } catch (error) {
      console.log("⚠️ Email service error (continuing anyway):", error.message);
    }
    
    // Start overdue check scheduler (non-blocking)
    try {
      startOverdueCheckScheduler();
    } catch (error) {
      console.log("⚠️ Scheduler initialization error:", error.message);
    }
    
    // Start server regardless of email/scheduler issues
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
      
      // Test server immediately after startup
      setTimeout(async () => {
        try {
          const response = await fetch(`http://localhost:${PORT}`);
          console.log(`✅ Server self-test passed: ${response.status}`);
        } catch (error) {
          console.log(`❌ Server self-test failed: ${error.message}`);
        }
      }, 1000);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });
