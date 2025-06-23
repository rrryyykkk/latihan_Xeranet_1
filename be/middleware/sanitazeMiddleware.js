import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import validator from "validator";

const basicSanitizer = (req, res, next) => {
  const sanitizeString = (str) => validator.escape(validator.trim(str));

  const sanitize = (obj) => {
    if (!obj || typeof obj !== "object") return;
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        obj[key] = sanitizeString(obj[key]);
      } else if (
        typeof obj[key] === "object" &&
        obj[key] !== null &&
        !(obj[key] instanceof Buffer) &&
        !Array.isArray(obj[key])
      ) {
        sanitize(obj[key]);
      }
    }
  };

  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
};

export const sanitazeMiddleware = [
  helmet(),
  mongoSanitize({
    replaceWith: "_",
    allowDots: true,
    dryRun: true,
  }),
  basicSanitizer,
];
