import express from "express";
import {
  createLogoPT,
  deleteLogoPT,
  getAllLogoPT,
  updateLogoPT,
} from "../controllers/logoPT.controllers.js";
import { verifyAdmin, verifyToken } from "../middleware/authMiddleware.js";
import upload from "../utils/multer.js";

const router = express.Router();

router.get("/", getAllLogoPT);
router.post(
  "/create",
  upload.single("logoPTImage"),
  verifyToken,
  verifyAdmin,
  createLogoPT
);
router.put(
  "/update/:id",
  upload.single("logoPTImage"),
  verifyToken,
  verifyAdmin,
  updateLogoPT
);
router.delete("/delete/:id", verifyToken, verifyAdmin, deleteLogoPT);

export default router;
