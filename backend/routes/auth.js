//routes/auth.js
import express from "express";
import { signupUser, loginUser, getMe } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// signup route
router.post("/signup", signupUser);

// login route
router.post("/login", loginUser);

// get logged-in user info (with optional auth)
router.get("/me", (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  authMiddleware(req, res, next);
}, getMe);

export default router;
