import dotenv from "dotenv";

dotenv.config();

export const setCsp = (req, res, next) => {
  const nonce = Buffer.from(Math.random().toString()).toString("base64");

  res.locals.cspNonce = nonce;

  const csp = ` default-src 'self';
    script-src 'self' 'nonce-${nonce}'  ${process.env.SCRIPT};
    style-src 'self' 'nonce-${nonce}'  ${process.env.TAILWINDCSS};
    font-src 'self' ${process.env.FONT};
    img-src 'self' data: ${process.env.IMG_UPLOAD};
    connect-src 'self' ${process.env.FE_PORT} https://*.googleapis.com;
    frame-src 'none';`
    .replace(/\s{2,}/g, " ")
    .trim();

  res.set("Content-Security-Policy", csp);
  next();
};
