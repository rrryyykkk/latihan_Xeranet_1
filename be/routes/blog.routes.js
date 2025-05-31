import express from "express";
import {
  createBlog,
  deleteBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
} from "../controllers/blog.controllers.js";
import { verifyAdmin, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getAllBlogs);
router.get("/:id", getBlogById);
router.post("/create", verifyToken, verifyAdmin, createBlog);
router.put("/update/:id", verifyToken, verifyAdmin, updateBlog);
router.delete("/delete/:id", verifyToken, verifyAdmin, deleteBlog);

export default router;
