import mongoose from "mongoose";

const logoPTSchema = new mongoose.Schema(
  {
    logoPTImage: { type: String },
    title: { type: String, required: true, trim: true },
    status: { type: String, default: "draft", enum: ["draft", "published"] },
  },
  {
    timestamps: true,
  }
);

const LogoPT = mongoose.model("LogoPT", logoPTSchema);
export default LogoPT;
