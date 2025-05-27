import User from "../models/users.models.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    console.time("register");
    const { userName, fullName, email, password, role } = req.body;

    // validasi email
    console.time("emailRegex:");
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Email is not valid" });
    }
    console.timeEnd("emailRegex:");
    // validasi minimal password
    console.time("passwordLength:");
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }
    console.timeEnd("passwordLength:");

    // cek email udah ada yg pake apa belum
    console.time("existingUser:");
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }
    console.timeEnd("existingUser:");

    // validasi role
    console.time("roleOptions:");
    const roleOptions = ["user", "admin"];
    const isValidRole = roleOptions.includes(role) ? role : "user";
    console.timeEnd("roleOptions:");
    // hash password
    console.time("hashPassword:");
    const hashedPassword = await bcrypt.hash(password, 10);
    console.timeEnd("hashPassword:");

    // buat user
    console.time("newUser:");
    const newUser = new User({
      userName,
      email,
      password: hashedPassword,
      fullName,
      role: isValidRole,
    });
    await newUser.save();
    console.timeEnd("newUser:");
    // Generate JWT
    console.time("jwt:");
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );
    console.timeEnd("jwt:");

    console.timeEnd("register");
    // set token dalam cookie httponly
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // ganti true jika menggunakan https
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 hari
    });

    res
      .status(201)
      .json({ message: "User registered successfully", userId: newUser._id });
  } catch (error) {
    console.log("Register Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  try {
    console.time("login");
    const { email, password } = req.body;
    // cek apakah ad field email dan password
    console.time("emailPassword:");
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    console.timeEnd("emailPassword:");

    // cek user berdasarkan email
    console.time("findOne:");
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Email or Password is invalid" });
    console.timeEnd("findOne:");
    // bandingkan password
    console.time("pw:");
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Email or Password is invalid" });
    console.timeEnd("pw:");
    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    // set token dalam cookie httponly
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // ganti true jika menggunakan https
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 hari
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        userName: user.userName,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
    console.timeEnd("login");
  } catch (error) {
    console.log("Login Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getMe = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.log("Get Me Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.log("Logout Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
