import createDomPurify from "dompurify";
import { JSDOM } from "jsdom";
import mongoSanitize from "express-mongo-sanitize";

const window = new JSDOM("").window;
const DOMPurify = createDomPurify(window);

// Helper function to sanitize all strings in an object
const sanitizeObject = (obj) => {
  for (const key in obj) {
    if (typeof obj[key] === "string") {
      obj[key] = DOMPurify.sanitize(obj[key]); // bersihkan string
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      sanitizeObject(obj[key]); // jika nested object, bersihkan juga
    }
  }
};

// Middleware untuk sanitize semua req body, query, dan params
const domPurifyMiddleware = (req, res, next) => {
  sanitizeObject(req.body);
  sanitizeObject(req.query);
  sanitizeObject(req.params);
  next();
};

// gabungkan dengan mongoSanitize (untuk cegah NoSQL injection)
const sanitazeMiddleware = [(mongoSanitize(), domPurifyMiddleware)];

export default sanitazeMiddleware;
