import crypto from "crypto";
import jwt from 'jsonwebtoken';
import cookie from "cookie";
import mongoose from "mongoose";

const COOKIE_NAME = "uid";

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

    // Provide both forms expected by code/tests
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