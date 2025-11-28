import jwt from "jsonwebtoken";
import { ensureUserRecord } from "../utils/userHelpers.js";

export const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch or provision user document
    const user = await ensureUserRecord(decoded.email, decoded.name);

        // Attach user info to request
        req.user = {
            email: user.email,
            username: user.username,
            id: user._id
        };
        
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // For tests that don't have database access, just set req.user = decoded
    if (process.env.NODE_ENV === 'test' && !process.env.USE_REAL_DB) {
      req.user = decoded;
      return next();
    }

    // Fetch the user from database to get the MongoDB _id
    const user = await ensureUserRecord(decoded.email, decoded.name);
    
    // Set the MongoDB ObjectId, not the email
    req.userId = user._id.toString();
    req.userEmail = user.email;
    req.user = user;
    
    next();
  } catch (error) {
    console.error('[AUTH] Error:', error);
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Alias for authenticateToken - used by various routes
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // For tests that don't have database access
    if (process.env.NODE_ENV === 'test' && !process.env.USE_REAL_DB) {
      req.user = { userId: decoded.userId || decoded.id, email: decoded.email };
      return next();
    }

    // Fetch the user from database
    const user = await ensureUserRecord(decoded.email, decoded.name);
    
    req.user = {
      userId: user._id.toString(),
      email: user.email,
      username: user.username
    };
    
    next();
  } catch (error) {
    console.error('[AUTH] Token verification error:', error.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};