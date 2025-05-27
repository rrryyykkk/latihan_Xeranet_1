import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    userName: { type: String, unique: true, trim: true, required: true },
    email: {
      type: String,
      unique: true,
      trim: true,
      required: true,
      match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    },
    password: { type: String, required: true, minLength: 6 },
    role: { type: String, default: "user", enum: ["user", "admin"] },
    avatar: {
      type: String,
      default: "null",
    },
    is2FaEnable: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model("Users", userSchema);
export default User;
