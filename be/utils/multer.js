import multer from "multer";
import path from "path";
import crypto from "crypto";

// Folder aman untuk simpan file
const UPLOAD_DIR = "uploads/logoPT";

// Validasi tipe file
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

// Simpan dengan nama aman dan unik
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = crypto.randomBytes(16).toString("hex") + ext;
    cb(null, uniqueName);
  },
});

// Batasi ukuran file
const limits = {
  fileSize: 1 * 1024 * 1024, // 1MB
};

const upload = multer({
  storage,
  fileFilter,
  limits,
});

export default upload;
