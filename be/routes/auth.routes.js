import express from "express";
import {
  getMe,
  login,
  logout,
  register,
} from "../controllers/auth.controllers.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import rateLimiter from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/register", rateLimiter, register);
router.post("/login", rateLimiter, login);
router.post("/logout", logout);
router.get("/me", verifyToken, getMe);

export default router;
