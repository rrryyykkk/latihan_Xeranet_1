import User from "../models/users.models.js";
import bcrypt from "bcrypt";
import jwt, { decode } from "jsonwebtoken";
import { generateRefreshToken, generateToken } from "../utils/token.js";
import axios from "axios";
import { sendEmail } from "../utils/nodemailer.js";
import redisClient from "../config/redis.js";
import crypto from "crypto";
import mongoose from "mongoose";
import {
  isValidImageUrl,
  uploadToCloudinary,
} from "../utils/uploadToCloudinary.js";

// validasi password (harus ad huruf besar, huruf kecil, angka, dan spesial karakter)
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;

// validasi email
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const register = async (req, res) => {
  // browser tidak menyimpan data apapun di cache, harus validasi ulang setiap request
  res.setHeader("cache-control", "no-cache, no-store, must-revalidate");
  res.setHeader("pragma", "no-cache");
  res.setHeader("expires", "0");
  try {
    const {
      userName,
      fullName,
      email,
      password,
      role,
      captchaToken,
      avatarUrl,
    } = req.body;

    // validasi req.body yg hars di isi
    if (!userName || !fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // verifikasi CAPTCHA harus connect dari fe kalau mau test
    // if (!captchaToken) {
    //   return res.status(400).json({ message: "Captcha is required" });
    // }

    // const verifyCaptcha = await axios.post(
    //   `https://www.google.com/recaptcha/api/siteverify`,
    //   {},
    //   {
    //     params: {
    //       secret: process.env.RECAPTCHA_SECRET_KEY,
    //       response: captchaToken,
    //     },
    //   }
    // );

    // if (!verifyCaptcha.data.success || !verifyCaptcha.data.score < 0.5) {
    //   return res.status(403).json({ message: "Failed CAPTCHA verification" });
    // }

    // validasi email
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Email is not valid" });
    }

    // validasi password
    if (!passwordRegex.test(password) || password.length < 8) {
      return res.status(400).json({
        message:
          "Password must contain at least 8 characters,with uppercase, lowercase,  number, and special character",
      });
    }

    // cek email udah ada yg pake apa belum
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // validasi avatar
    const file = req.file;
    let finalAvatarUrl = avatarUrl;

    if (avatarUrl) {
      if (!isValidImageUrl(avatarUrl)) {
        return res.status(400).json({ message: "Invalid avatar URL" });
      }
      finalAvatarUrl = avatarUrl;
    } else if (file) {
      try {
        const uploadedFile = await uploadToCloudinary(
          file.buffer,
          file,
          "avatars"
        );
        finalAvatarUrl = uploadedFile.url;
      } catch (error) {
        return res.status(500).json({ message: "Failed to upload avatar" });
      }
    }

    // validasi role
    let assignedRole = "user";
    if (role && ["user", "admin"].includes(role)) {
      assignedRole = role;
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // buat user
    const newUser = new User({
      userName,
      email,
      password: hashedPassword,
      fullName,
      role: assignedRole,
      avatar: finalAvatarUrl,
    });
    await newUser.save();

    // Generate JWT
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "15m",
      }
    );

    // set token dalam cookie httponly
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // ganti true jika menggunakan https
      sameSite: "strict",
      maxAge: 12 * 60 * 60 * 1000, // 12 jam
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
  // browser tidak menyimpan data apapun di cache, harus validasi ulang setiap request
  res.setHeader("cache-control", "no-cache, no-store, must-revalidate");
  res.setHeader("pragma", "no-cache");
  res.setHeader("expires", "0");
  try {
    const { email, password } = req.body;

    //  verifikasi CAPTCHA harus connect dari fe kalau mau test
    // if (!req.body.captchaToken) {
    //   return res.status(400).json({ message: "Captcha is required" });
    // }

    // const verifyCaptcha = await axios.post(
    //   `https://www.google.com/recaptcha/api/siteverify`,
    //   {},
    //   {
    //     params: {
    //       secret: process.env.RECAPTCHA_SECRET_KEY,
    //       response: req.body.captchaToken,
    //     },
    //   }
    // );

    // if (!verifyCaptcha.data.success || !verifyCaptcha.data.score < 0.5) {
    //   return res.status(403).json({ message: "Failed CAPTCHA verification" });
    // }

    // cek validasi email
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Email is not valid" });
    }

    // cek validasi password nnti diaktifkan jika sudah di test
    // if (!passwordRegex.test(password) || password.length < 8) {
    //   return res.status(400).json({
    //     message:
    //       "Password must contain at least 8 characters,with uppercase, lowercase,  number, and special character",
    //   });
    // }

    // cek apakah ad field email dan password
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // cek user berdasarkan email

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Email or Password is invalid" });

    // bandingkan password

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Email or Password is invalid" });

    // Generate JWT
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // cek 2FA jika dibutuhkan
    // if (user.is2FaEnable) {
    //   // generate dan kirimkan otp via email
    //   const otp = Math.floor(100000 + Math.random() * 900000).toString();
    //   user.otp = otp;
    //   user.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 menit
    //   await user.save();

    //   // kirimkan otp via email
    //   await sendEmail({
    //     from: process.env.EMAIL,
    //     to: user.email,
    //     subject: "Your OTP Code",
    //     text: `Your OTP code is: ${otp}. It will expire in 5 minutes.`,
    //     html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
    //         <h2 style="color: #e11d48; text-align: center;">Admin</h2>
    //         <p style="font-size: 16px; color: #333;">
    //           Dear User,
    //         </p>
    //         <p style="font-size: 16px; color: #333;">
    //           You requested a One-Time Password (OTP) to log in. Please use the code below to complete your authentication. This code is valid for <strong>5 minutes</strong>.
    //         </p>
    //         <div style="text-align: center; margin: 32px 0;">
    //           <span style="display: inline-block; font-size: 32px; color: #fff; background-color: #e11d48; padding: 12px 24px; border-radius: 8px; font-weight: bold; letter-spacing: 4px;">
    //             ${otp}
    //           </span>
    //         </div>
    //         <p style="font-size: 14px; color: #666;">
    //           If you did not request this code, please ignore this email or contact our support team.
    //         </p>
    //         <p style="font-size: 14px; color: #999; text-align: center; margin-top: 32px;">
    //           &copy; ${new Date().getFullYear()} Xeranet Solutions Technology
    //         </p>
    //       </div>`,
    //   });

    //   // kirim response untuk arahkan user ke halaman otp

    //   return res.status(200).json({
    //     message: "Login successful, please verify your OTP code",
    //     is2FaEnable: true,
    //     uid: user._id,
    //   });
    // }

    // set token dalam cookie httponly
    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: false, // ganti true jika menggunakan https
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 menit
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, // 1 jam
    });

    // simpan refresh token di db
    // user.refreshToken = refreshToken;
    // await user.save();

    // simpan token ke redis untuk chace
    await redisClient.set(`refreshToken:${user._id}`, refreshToken, {
      EX: 60 * 60, // 1 jam
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        userName: user.userName,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
      },
    });
  } catch (error) {
    console.log("Login Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getMe = async (req, res) => {
  try {
    const userId = req.userId;

    // validasi format MongoDB objectId
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ message: "Invalid user id" });

    // ambil data user tanpa password
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({
      id: user._id,
      userName: user.userName,
      fullName: user.fullName,
      role: user.role,
      email: user.email,
    });
  } catch (error) {
    console.log("Get Me Error:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.cookies.token;
    const refreshToken = req.cookies.refreshToken;
    // pastikan 2 token ada
    if (!token || !refreshToken)
      return res.status(401).json({ message: "Unauthorized: No token" });

    // hapus token di db
    if (token && refreshToken) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
      // hapus token di redis
      await redisClient.del(`refreshToken:${decoded.id}`);
    }
    res.clearCookie("token", {
      httpOnly: true,
      secure: false, // ganti true jika menggunakan https
      sameSite: "strict",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false, // ganti true jika menggunakan https
      sameSite: "strict",
    });

    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.log("Logout Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const refreshToken = async (req, res) => {
  const oldToken = req.cookies.refreshToken;
  if (!oldToken) res.status(401).json({ message: "Unauthorized: No token" });
  console.log("token:", oldToken); // dihapus saat fiks
  try {
    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET);
    console.log("decoded:", decoded);
    if (!decoded)
      return res.status(401).json({ message: "Unauthorized: Invalid token" });

    // jika pakai redis untuk cache
    const storageToken = await redisClient.get(`refreshToken:${decoded.id}`);
    console.log("storageToken:", storageToken);
    if (!storageToken || storageToken !== oldToken)
      return res.status(401).json({ message: "Unauthorized: Token not found" });

    // rotasi refresh token
    await redisClient.del(`refreshToken:${decoded.id}`);

    // generate new access token
    // const user = await User.findById(decoded.id);

    // if (!user ) {
    //   return res.status(401).json({ message: "Unauthorized: User not found" });
    // }

    const newAccessToken = generateToken(decoded);
    const newRefreshToken = generateRefreshToken(decoded);
    console.log("New Access Token:", newAccessToken);
    console.log("New Refresh Token:", newRefreshToken);

    await redisClient.set(`refreshToken:${decoded.id}`, newAccessToken, {
      EX: 60 * 60, // 1 jam
    });

    res.cookie("token", newAccessToken, {
      httpOnly: true,
      secure: false, // ganti true jika menggunakan https
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 menit
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: false, // ganti true jika menggunakan https
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, // 1 jam
    });

    return res.status(200).json({ message: "Refresh token successful" });
  } catch (error) {
    console.log("Refresh Token Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verify2FA = async (req, res) => {
  try {
    const { uid, otp } = req.body;

    if (!uid || !otp || typeof otp !== "string" || otp.length !== 6) {
      return res.status(400).json({ message: "invalid request" });
    }
    const user = await User.findById(uid);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.otp || !otp.otpExpiry || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "OTP expired or invalid" });
    }

    // bersihkan opt
    user.otp = null;
    user.otpExpiry = null;

    // buat token
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;

    await user.save();

    // simpan refresh token ke redis (gunakan userId sebagai key)
    await redisClient.set(`refreshToken:${user._id}`, refreshToken, {
      EX: 60 * 60, // 1 jam
    });

    // pasang ke cookie
    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: false, // ganti true jika menggunakan https
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 menit
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, // 1 jam
    });

    res.status(200).json({
      message: "2FA successfuly ,Login successful",
      user: {
        id: user._id,
        userName: user.userName,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
      },
    });
  } catch (error) {
    console.log("verify2FA Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
