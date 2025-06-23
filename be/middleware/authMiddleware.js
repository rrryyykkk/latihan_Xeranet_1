import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token)
    return res.status(401).json({ message: "Unauthorized: No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"], // atau yang sesuai
    });

    if (decoded === null || Array.isArray(decoded)) {
      return res.status(401).json({ message: "Unauthorized: Invalid payload" });
    }

    const { id, role, email } = decoded;
    if (
      typeof id !== "string" ||
      typeof role !== "string" ||
      typeof email !== "string"
    ) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Invalid payload fields" });
    }

    req.userId = id;
    req.user = { id, role, email }; // only trusted fields
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Unauthorized: Token expired" });
    }
    console.error("[verifyToken]", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyAdmin = (req, res, next) => {
  try {
    if (
      !Object.prototype.hasOwnProperty.call(req, "user") ||
      typeof req.user !== "object" ||
      req.user === null
    ) {
      return res.status(401).json({ message: "Unauthorized: No user" });
    }

    const safeKeys = ["id", "role", "email", "fullName", "userName"];
    const user = Object.create(null);

    for (const key of safeKeys) {
      if (Object.prototype.hasOwnProperty.call(req.user, key)) {
        user[key] = req.user[key];
      }
    }

    const role = user.role;
    if (typeof role !== "string" || role.toLowerCase() !== "admin") {
      return res.status(403).json({ message: "Forbidden: Not admin" });
    }

    Object.freeze(user);
    req.user = user;

    next();
  } catch (error) {
    console.error("[verifyAdmin]", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
