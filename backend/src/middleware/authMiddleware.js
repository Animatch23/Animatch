import crypto from "crypto";
import jwt from 'jsonwebtoken';
import cookie from "cookie";
import mongoose from "mongoose";

const COOKIE_NAME = "uid";

function isHex24(str) {
  return typeof str === "string" && /^[a-fA-F0-9]{24}$/.test(str);
}

export function ensureUser(req, res, next) {
  try {
    // Parse incoming cookies
    const parsed = cookie.parse(req.headers.cookie || "");
    let uid = parsed[COOKIE_NAME];

    // Ensure uid is a valid 24-hex string (Mongo ObjectId compatible)
    if (!isHex24(uid)) {
      uid = new mongoose.Types.ObjectId().toHexString();

      // Set cookie so the browser keeps a stable id
      const secure = process.env.NODE_ENV === "production";
      res.setHeader(
        "Set-Cookie",
        cookie.serialize(COOKIE_NAME, uid, {
          httpOnly: true,
          sameSite: "lax",
          secure,
          path: "/",
          maxAge: 60 * 60 * 24 * 365, // 1 year
        })
      );
    }

    req.userId = uid;
    next();
  } catch (err) {
    next(err);
  }
}

export const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Add user info to request
      req.user = {
        id: decoded.id
      };
      
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