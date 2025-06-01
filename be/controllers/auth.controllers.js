import User from "../models/users.models.js";
import bcrypt from "bcrypt";
import jwt, { decode } from "jsonwebtoken";
import { generateRefreshToken, generateToken } from "../utils/token.js";
import axios from "axios";
import { sendEmail } from "../utils/nodemailer.js";
import redisClient from "../config/redis.js";

export const register = async (req, res) => {
  try {
    const { userName, fullName, email, password, role, captchaToken } =
      req.body;

    // verifikasi CAPTCHA harus connect dari fe kalau mau test
    if (!captchaToken) {
      return res.status(400).json({ message: "Captcha is required" });
    }

    const verifyCaptcha = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      {},
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: captchaToken,
        },
      }
    );

    if (!verifyCaptcha.data.success || !verifyCaptcha.data.score < 0.5) {
      return res.status(403).json({ message: "Failed CAPTCHA verification" });
    }

    // validasi email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Email is not valid" });
    }

    // validasi minimal password

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // cek email udah ada yg pake apa belum

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // validasi role

    const roleOptions = ["user", "admin"];
    const isValidRole = roleOptions.includes(role) ? role : "user";

    // hash password

    const hashedPassword = await bcrypt.hash(password, 10);

    // buat user
    const newUser = new User({
      userName,
      email,
      password: hashedPassword,
      fullName,
      role: isValidRole,
    });
    await newUser.save();

    // Generate JWT
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
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
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
    });

    // simpan refresh token di db
    // user.refreshToken = refreshToken;
    // await user.save();

    // simpan token ke redis untuk chace
    await redisClient.set(`refreshToken:${user._id}`, refreshToken, {
      EX: 7 * 24 * 60 * 60,
    });
    console.log("refreshToken:", refreshToken);
    console.log("Login Success");

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        userName: user.userName,
        fullName: user.fullName,
        role: user.role,
      },
    });
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

export const logout = async (req, res) => {
  try {
    const token = req.cookies.token;
    const refreshToken = req.cookies.refreshToken;
    if (token && refreshToken) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
      // hapus token di redis
      await redisClient.del(`refreshToken:${decoded.id}`);
    }
    res.clearCookie("token");
    res.clearCookie("refreshToken");

    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.log("Logout Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) res.status(401).json({ message: "Unauthorized: No token" });
  console.log("token:", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("decoded:", decoded);
    if (!decoded)
      return res.status(401).json({ message: "Unauthorized: Invalid token" });

    // const user = await User.findById(decoded.id);

    // if (!user || user.refreshToken !== token) {
    //   return res.status(401).json({ message: "Unauthorized: User not found" });
    // }

    // jika pakai redis untuk cache
    const storageToken = await redisClient.get(`refreshToken:${decoded.id}`);
    console.log("storageToken:", storageToken);
    if (!storageToken || storageToken !== token)
      return res.status(401).json({ message: "Unauthorized: Token not found" });

    const newAccessToken = generateToken(decoded);
    console.log("New Access Token:", newAccessToken);

    res.cookie("token", newAccessToken, {
      httpOnly: true,
      secure: false, // ganti true jika menggunakan https
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 menit
    });

    return res.status(200).json({ message: "Refresh token successful" });
  } catch (error) {
    console.log("Refresh Token Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verify2FA = async (req, res) => {
  try {
    const { uid, otp } = req.body;
    const user = await User.findById(uid);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // bersihkan opt
    user.otp = null;
    user.otpExpiry = null;

    // buat token
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;

    await user.save();

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
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
    });

    res.status(200).json({
      message: "2FA successfuly ,Login successful",
      user: {
        id: user._id,
        userName: user.userName,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    console.log("verify2FA Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
