import jwt from "jsonwebtoken";
import { ensureUserRecord } from "../utils/userHelpers.js";

const authenticate = async (req, res, next) => {
  try {
    // Merge: Check both cookies (us-6) and headers (sprint-2)
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Sprint-2 logic: Fetch or provision user document
    const user = await ensureUserRecord(decoded.email, decoded.name);

    // Sprint-2 logic: Attach user info to request
    req.user = {
        email: user.email,
        username: user.username,
        id: user._id
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const authMiddleware = async (req, res, next) => {
  try {
    // Merge: Check both cookies (us-6) and headers (sprint-2)
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      // Use us-6 message to keep tests passing
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Sprint-2 logic: For tests that don't have database access
    if (process.env.NODE_ENV === 'test' && !process.env.USE_REAL_DB) {
      req.user = decoded;
      return next();
    }

    // Sprint-2 logic: Fetch the user from database
    const user = await ensureUserRecord(decoded.email, decoded.name);
    
    // Set the MongoDB ObjectId and user details
    req.userId = user._id.toString();
    req.userEmail = user.email;
    req.user = user;
    
    next();
  } catch (error) {
    console.error('[AUTH] Error:', error);
    // Return 403 as expected by some tests (sprint-2 logic)
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Create the alias required by tests (us-6 logic)
const protect = authMiddleware;

// Export everything needed by both branches
export { authMiddleware, authenticate, protect };
export default authMiddleware;
``// filepath: c:\Bon_AllGit\Animatch\backend\src\middleware\authMiddleware.js
import jwt from "jsonwebtoken";
import { ensureUserRecord } from "../utils/userHelpers.js";

const authenticate = async (req, res, next) => {
  try {
    // Merge: Check both cookies (us-6) and headers (sprint-2)
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Sprint-2 logic: Fetch or provision user document
    const user = await ensureUserRecord(decoded.email, decoded.name);

    // Sprint-2 logic: Attach user info to request
    req.user = {
        email: user.email,
        username: user.username,
        id: user._id
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const authMiddleware = async (req, res, next) => {
  try {
    // Merge: Check both cookies (us-6) and headers (sprint-2)
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      // Use us-6 message to keep tests passing
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Sprint-2 logic: For tests that don't have database access
    if (process.env.NODE_ENV === 'test' && !process.env.USE_REAL_DB) {
      req.user = decoded;
      return next();
    }

    // Sprint-2 logic: Fetch the user from database
    const user = await ensureUserRecord(decoded.email, decoded.name);
    
    // Set the MongoDB ObjectId and user details
    req.userId = user._id.toString();
    req.userEmail = user.email;
    req.user = user;
    
    next();
  } catch (error) {
    console.error('[AUTH] Error:', error);
    // Return 403 as expected by some tests (sprint-2 logic)
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Create the alias required by tests (us-6 logic)
const protect = authMiddleware;

// Export everything needed by both branches
export { authMiddleware, authenticate, protect };
export default authMiddleware;
