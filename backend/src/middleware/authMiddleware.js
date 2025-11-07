import jwt from "jsonwebtoken";
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Fetch full user document
        const user = await User.findOne({ email: decoded.email });
        
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch the user from database to get the MongoDB _id
    const user = await User.findOne({ email: decoded.email });
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
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