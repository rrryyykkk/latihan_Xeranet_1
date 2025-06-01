import express from "express";
import {
  getMe,
  login,
  logout,
  refreshToken,
  register,
} from "../controllers/auth.controllers.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import rateLimiter from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/register", rateLimiter, register);
router.post("/login", rateLimiter, login);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);
router.get("/me", verifyToken, getMe);

export default router;
