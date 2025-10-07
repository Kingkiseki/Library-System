//routes/auth.js
import express from "express";
import { signupUser, loginUser, getMe } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// signup route
router.post("/signup", signupUser);

// login route
router.post("/login", loginUser);

// get logged-in user info
router.get("/me", authMiddleware, getMe);

export default router;
