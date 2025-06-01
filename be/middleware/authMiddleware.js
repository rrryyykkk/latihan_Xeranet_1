import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  // ambil token
  const token = req.cookies?.token;
  if (!token)
    return res.status(401).json({ message: "Unauthorized: No token" });
  try {
    // verifikasi token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded)
      return res.status(401).json({ message: "Unauthorized: Invalid token" });

    req.userId = decoded.id;
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Unauthorized: Token expired" });
    }
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyAdmin = (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Not admin" });
    }
    next();
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
