import crypto from "crypto";
import jwt from 'jsonwebtoken';
import cookie from "cookie";
import mongoose from "mongoose";

const COOKIE_NAME = "uid";

function parseAuth(header) {
  if (!header) return null;
  const parts = header.split(" ");
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1].trim();
  return header.trim();
}

export function requireAuth(req, res, next) {
  const token = parseAuth(req.headers.authorization);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Deterministic ObjectId from token so multiple requests map to the same user
    let objId;
    if (/^[a-fA-F0-9]{24}$/.test(token)) {
      objId = new mongoose.Types.ObjectId(token);
    } else {
      const hex24 = crypto.createHash("sha1").update(token).digest("hex").slice(0, 24);
      objId = new mongoose.Types.ObjectId(hex24);
    }
    req.user = { id: objId };
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

export function ensureUser(req, res, next) {
  try {
    const parsed = cookie.parse(req.headers.cookie || "");
    let raw = parsed[COOKIE_NAME];

    if (!raw || !/^[a-fA-F0-9]{24}$/.test(raw)) {
      raw = new mongoose.Types.ObjectId().toHexString();
      res.setHeader(
        "Set-Cookie",
        cookie.serialize(COOKIE_NAME, raw, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
        })
      );
    }

    req.user = { id: new mongoose.Types.ObjectId(raw) };
    req.userId = raw;
    next();
  } catch (e) {
    next(e);
  }
}

export const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.id };
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(401).json({ message: 'Not authorized' });
    }
  }
  
  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};