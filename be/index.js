import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import sanitazeMiddleware from "./middleware/sanitazeMiddleware.js";
// Routes
import authRoutes from "./routes/auth.routes.js";

dotenv.config(); // <- harus dipanggil sebelum pakai .env

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(sanitazeMiddleware);

app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 3000;

// Connect to DB & start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
};

startServer();
