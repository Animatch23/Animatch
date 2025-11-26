import jwt from "jsonwebtoken";
import { ensureUserRecord } from "../utils/userHelpers.js";
import User from "../models/User.js";

export const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');

        let user;
        
        // Handle test tokens that have 'id' field (used in tests)
        if (decoded.id) {
            user = await User.findById(decoded.id);
            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }
        }
        // Handle Firebase tokens that have 'email' and 'name' fields
        else if (decoded.email) {
            user = await ensureUserRecord(decoded.email, decoded.name);
        }
        else {
            return res.status(401).json({ message: 'Invalid token payload' });
        }

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

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');

    // Use User.findById to fetch user by ID (for backward compatibility)
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Set the MongoDB ObjectId, not the email
    req.userId = user._id.toString();
    req.userEmail = user.email;
    req.user = user;
    
    next();
  } catch (error) {
    console.error('[AUTH] Error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Export protect as an alias for authenticate (for us-6 compatibility)
export const protect = authenticate;

// Export authMiddleware as default for tests
export default authMiddleware;
