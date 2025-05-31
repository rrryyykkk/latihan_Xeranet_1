import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    blogImage: { type: String },
    author: { type: String, required: true },
    status: { type: String, default: "draft", enum: ["draft", "published"] },
  },
  {
    timestamps: true,
  }
);

// text search index
blogSchema.index({ title: "text", description: "text" });

const Blog = mongoose.model("Blog", blogSchema);
export default Blog;
