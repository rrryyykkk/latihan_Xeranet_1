import express from "express";
import {
  createTestimoni,
  deleteTestimoni,
  getAllTestimoni,
  updateTestimoni,
} from "../controllers/testimoni.controllers.js";
import { verifyAdmin, verifyToken } from "../middleware/authMiddleware.js";
import upload from "../utils/multer.js";

const router = express.Router();

router.get("/", getAllTestimoni);
router.post(
  "/create",
  upload.single("authorImage"),
  verifyToken,
  verifyAdmin,
  createTestimoni
);
router.put(
  "/update/:id",
  upload.single("authorImage"),
  verifyToken,
  verifyAdmin,
  updateTestimoni
);
router.delete("/delete/:id", verifyToken, verifyAdmin, deleteTestimoni);

export default router;
