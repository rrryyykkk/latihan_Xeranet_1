import mongoose from "mongoose";
import bcrypt from "bcrypt";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    userName: { type: String, unique: true, trim: true, required: true },
    email: {
      type: String,
      unique: true,
      trim: true,
      required: true,
      match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    },
    password: { type: String, required: true, minLength: 8, maxLength: 64 },
    role: { type: String, default: "user", enum: ["user", "admin"] },
    avatar: {
      type: String,
      default: null,
      validate: {
        validator: (url) =>
          url === null ||
          /^https:\/\/(res\.cloudinary\.com|images\.unsplash\.com|cdn\.example\.com)\/.*\.(jpg|jpeg|png|webp)$/i.test(
            url
          ),
        message: "Invalid avatar URL",
      },
    },
    is2FaEnable: { type: Boolean, default: false },
    refreshToken: { type: String },
  },
  { timestamps: true }
);

// hash password sebelum di save
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// sembunyikan data sensitive dari response
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.refreshToken;
  delete user.__v;
  return user;
};

// indexing secure
userSchema.index({ email: 1, userName: 1 }, { unique: true });

const User = mongoose.model("Users", userSchema);
export default User;
