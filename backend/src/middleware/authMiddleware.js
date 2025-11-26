import jwt from "jsonwebtoken";
import { ensureUserRecord } from "../utils/userHelpers.js";
import User from "../models/User.js";

/**
 * Authentication middleware
 * Validates JWT token and attaches user info to request
 * Supports both test tokens (with id field) and Firebase tokens (with email field)
 */
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "test-secret");

    let user;
    
    // Handle test tokens that have 'id' field (used in tests)
    if (decoded.id) {
      user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
    }
    // Handle Firebase tokens that have 'email' and 'name' fields
    else if (decoded.email) {
      user = await ensureUserRecord(decoded.email, decoded.name);
    }
    else {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // Attach user info to request (support multiple formats for compatibility)
    req.userId = user._id.toString();
    req.userEmail = user.email;
    req.user = {
      email: user.email,
      username: user.username,
      id: user._id,
      _id: user._id
    };
    
    return next();
  } catch (error) {
    // Keep logs minimal during test runs
    console.error(
      "[AUTH] Error:",
      process.env.NODE_ENV === "test" ? (error?.message || String(error)) : error
    );
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Export as default and named exports for backward compatibility
export default authMiddleware;
export { authMiddleware };  // Named export for files that use destructuring
export const protect = authMiddleware;
export const authenticate = authMiddleware;

