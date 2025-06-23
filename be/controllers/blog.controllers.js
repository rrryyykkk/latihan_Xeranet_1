import mongoose from "mongoose";
import blogModels from "../models/blog.models.js";
import {
  uploadToCloudinary,
  isValidImageUrl,
  downloadAndUpload,
} from "../utils/uploadToCloudinary.js";
import Joi from "joi";

// menghindari karakter-karakter khusus di dalam sebuah string agar bisa digunakan dengan aman di dalam Regex (Regular Expression)
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// validasi pakai joi create blog
const createBlogSchema = Joi.object(
  {
    title: Joi.string().required(),
    description: Joi.string().required(),
    blogImage: Joi.string(),
    author: Joi.string().required(),
    status: Joi.string().valid("draft", "published").default("draft"),
  },
  { abortEarly: false }
);

const updateBlogSchema = Joi.object(
  {
    title: Joi.string(),
    description: Joi.string(),
    blogImage: Joi.string(),
    author: Joi.string(),
    status: Joi.string().valid("draft", "published").default("draft"),
  },
  { abortEarly: false }
);

// ✅ GET All Blogs with Pagination & Search
export const getAllBlogs = async (req, res) => {
  try {
    let { page = 1, limit = 10, search } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    if (isNaN(page) || isNaN(limit))
      return res.status(400).json({ message: "Invalid page or limit" });

    const filters = {};
    if (search && typeof search === "string" && search.trim() !== "") {
      const safeSearch = escapeRegex(search.trim());
      filters.title = { $regex: safeSearch, $options: "i" };
    }

    const total = await blogModels.countDocuments(filters);
    const blogs = await blogModels
      .find(filters)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      blogs,
      currentPage: page,
      totalPage: Math.ceil(total / limit),
      totalData: total,
    });
  } catch (err) {
    console.error("Error getAllBlogs:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ GET Single Blog by ID
export const getBlogById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ message: "Invalid blog id" });

  try {
    const blog = await blogModels.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    res.status(200).json({ blog });
  } catch (err) {
    console.error("Error getBlogById:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ CREATE Blog
export const createBlog = async (req, res) => {
  try {
    const { error, value } = createBlogSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const { title, description, blogImage: blogImageUrl, status } = value;
    let blogImage = "";

    const author = req.body.author || "admin";

    if (req.file) {
      const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Unsupported image type" });
      }

      const result = await uploadToCloudinary(
        req.file.buffer,
        req.file,
        "blog"
      );
      blogImage = result.url;
    } else if (blogImageUrl && isValidImageUrl(blogImageUrl)) {
      const result = await downloadAndUpload(blogImageUrl, "blog");
      blogImage = result.url;
    }

    const newBlog = await blogModels.create({
      title,
      description,
      author,
      blogImage,
      status,
    });

    res.status(201).json({ message: "Blog created", blog: newBlog });
  } catch (err) {
    console.error("Error createBlog:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ UPDATE Blog
export const updateBlog = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ message: "Invalid blog id" });
  try {
    const { error, value } = updateBlogSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const {
      title,
      description,
      author,
      blogImage: blogImageUrl,
      status,
    } = value;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (author !== undefined) updateData.author = author;

    if (req.file) {
      const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Unsupported image type" });
      }

      const result = await uploadToCloudinary(
        req.file.buffer,
        req.file,
        "blog"
      );
      updateData.blogImage = result.url;
    } else if (blogImageUrl && isValidImageUrl(blogImageUrl)) {
      const result = await downloadAndUpload(blogImageUrl, "blog");
      updateData.blogImage = result.url;
    }

    const updatedBlog = await blogModels.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedBlog)
      return res.status(404).json({ message: "Blog not found" });

    res.status(200).json({ message: "Blog updated", blog: updatedBlog });
  } catch (err) {
    console.error("Error updateBlog:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ DELETE Blog
export const deleteBlog = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ message: "Invalid blog id" });

  try {
    const blog = await blogModels.findByIdAndDelete(id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    res.status(200).json({ message: "Blog deleted", success: true });
  } catch (err) {
    console.error("Error deleteBlog:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
