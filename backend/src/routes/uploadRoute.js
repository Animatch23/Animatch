import express from "express";
import multer from "multer";
import path from "path";
import User from "../models/User.js";
import fs from 'fs';

/**
 * Determines the upload directory based on environment
 * @returns {string} Upload directory path
 */
const getUploadDir = () => {
    return process.env.NODE_ENV === 'test' ? 'test-uploads' : 'uploads';
};

/**
 * Validates user input for required fields
 * @param {string} username - The username to validate
 * @returns {boolean} True if valid
 * @throws {Error} If username is missing or empty
 */
export const validateUserInput = (username) => {
    if (!username) {
        throw new Error("Username is required");
    }
    return true;
};

/**
 * Creates profile picture object with URL and blur status
 * @param {Object} file - Multer file object
 * @param {string} uploadDir - Directory where file is stored
 * @returns {Object|null} Profile picture object or null if no file
 */
export const createProfilePictureObject = (file, uploadDir) => {
    return file 
        ? { url: `/${uploadDir}/${file.filename}`, isBlurred: true }
        : null;
};

/**
 * Creates user data object combining username and profile picture
 * @param {string} username - User's username
 * @param {Object|null} profilePicture - Profile picture object or null
 * @returns {Object} User data object
 */
export const createUserData = (username, profilePicture) => {
    return {
        username,
        profilePicture
    };
};

// Configure multer storage settings
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = getUploadDir();
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp and random number
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

// Configure multer with storage and file filtering
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Only allow image files
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Only image files are allowed!"), false);
        }
        cb(null, true);
    }
});

const router = express.Router();

/**
 * POST /upload
 * Creates a new user with optional profile picture upload
 * @route POST /
 * @param {string} username - Required username in request body
 * @param {File} file - Optional image file for profile picture
 * @returns {Object} 201 - User created successfully
 * @returns {Object} 400 - Validation error or upload error
 * @returns {Object} 500 - Server error
 */
router.post('/', upload.single('file'), async (req, res) => {
    try {
        const { username } = req.body;
        
        validateUserInput(username);
        
        const uploadDir = getUploadDir();
        const profilePicture = createProfilePictureObject(req.file, uploadDir);
        const userData = createUserData(username, profilePicture);
        
        const newUser = new User(userData);
        await newUser.save();
        
        res.status(201).json({ message: "User created", user: newUser });
    } catch (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: "Upload error", error: err.message });
        }
        if (err.message === "Username is required") {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).json({ message: "Failed to create user.", error: err.message });
    }
});

export default router;