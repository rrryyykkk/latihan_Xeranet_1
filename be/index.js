import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
// Middleware security
import helmet from "helmet";
import { setCsp } from "./middleware/csp.js";
import sanitazeMiddleware from "./middleware/sanitazeMiddleware.js";
// Routes
import authRoutes from "./routes/auth.routes.js";
import blogRoutes from "./routes/blog.routes.js";
import logoPTRoutes from "./routes/logoPT.routes.js";
import testimoniRoutes from "./routes/testimoni.routes.js";

dotenv.config(); // <- harus dipanggil sebelum pakai .env

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(sanitazeMiddleware);

// csp header
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(setCsp);

// api
app.use("/api/auth", authRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/logoPT", logoPTRoutes);
app.use("/api/testimoni", testimoniRoutes);

const PORT = process.env.PORT || 3000;

// Connect to DB & start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
};

startServer();
