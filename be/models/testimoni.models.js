import mongoose from "mongoose";

const testimoniSchema = new mongoose.Schema(
  {
    author: { type: String, required: true, trim: true },
    authorImage: { type: String },
    description: { type: String, required: true },
    ratting: { type: Number, required: true, min: 1, max: 5 },
    status: { type: String, default: "draft", enum: ["draft", "published"] },
  },
  {
    timestamps: true,
  }
);

const Testimoni = mongoose.model("Testimoni", testimoniSchema);
export default Testimoni;
