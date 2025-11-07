import express from "express";
import multer from "multer";
import path from "path";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import fs from 'fs';

/**
 * Determines the upload directory based on environment
 * @returns {string} Upload directory path
 */
const getUploadDir = () => {
    return process.env.NODE_ENV === 'test' ? 'test-uploads' : 'uploads';
};

/**
 * Validates user input for required email field
 * @param {string} email - The email to validate
 * @returns {boolean} True if valid
 * @throws {Error} If email is missing or invalid
 */
export const validateEmailInput = (email) => {
    if (!email) {
        throw new Error("Email is required");
    }
    return true;
};

/**
 * Validates user input for required fields
 * @param {string} username - The username to validate
 * @returns {boolean} True if valid
 * @throws {Error} If username is missing or empty
 */
export const validateUsernameInput = (username) => {
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
export const createUserData = (email, username, profilePicture) => {
    return {
        email,
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
 * Creates a new user with optional profile picture upload and terms acceptance
 * @route POST /
 * @param {string} email - Required email in request body
 * @param {string} username - Required username in request body
 * @param {string} acceptTerms - Optional flag to accept terms (default: false)
 * @param {File} file - Optional image file for profile picture
 * @returns {Object} 201 - User created successfully
 * @returns {Object} 400 - Validation error or upload error
 * @returns {Object} 500 - Server error
 */
router.post('/', upload.single('profilePhoto'), async (req, res) => {
    try {
        const email = req.body.email;
        const username = req.body.username;
        const acceptTermsFlag = req.body.acceptTerms === 'true' || req.body.acceptTerms === true;
        
        validateEmailInput(email);
        validateUsernameInput(username);
        
        const uploadDir = getUploadDir();
        const profilePicture = createProfilePictureObject(req.file, uploadDir);
        const userData = createUserData(email, username, profilePicture);
        
        // If acceptTerms flag is set, include terms acceptance
        if (acceptTermsFlag) {
            userData.termsAccepted = true;
            userData.termsAcceptedDate = new Date();
            userData.termsAcceptedVersion = "1.0";
        }
        
        const newUser = new User(userData);
        await newUser.save();
        
        // Create profile entry for the user
        const profile = new Profile({
            userId: newUser._id.toString(),
            username: newUser.username,
            pictureUrl: profilePicture?.url || null,
            isBlurred: profilePicture?.isBlurred || true
        });
        await profile.save();
        
        res.status(201).json({ message: "User created", user: newUser });
    } catch (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: "Upload error", error: err.message });
        }
        if (err.message === "Username is required" || err.message === "Email is required") {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).json({ message: "Failed to create user.", error: err.message });
    }
});

/**
 * POST /upload/interests
 * Updates user profile with interests (course, dorm, organizations)
 * @route POST /interests
 * @param {string} email - Required email to find user
 * @param {Object} interests - Interests object with course, dorm, organizations
 * @returns {Object} 200 - Interests updated successfully
 * @returns {Object} 400 - Validation error
 * @returns {Object} 404 - User not found
 * @returns {Object} 500 - Server error
 */
router.post('/interests', async (req, res) => {
    try {
        const { email, interests } = req.body;
        
        console.log('[POST /upload/interests] Request received:', { email, interests });
        
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            console.log('[POST /upload/interests] User not found:', email);
            return res.status(404).json({ message: "User not found" });
        }
        
        // Parse interests - frontend sends array of topics, we need to structure them
        // For now, treat all as organizations until we have proper UI for course/dorm
        const structuredInterests = {
            course: interests.course || null,
            dorm: interests.dorm || null,
            organizations: Array.isArray(interests) ? interests : (interests.organizations || [])
        };
        
        console.log('[POST /upload/interests] Structured interests:', structuredInterests);
        
        // Update or create profile with interests
        const profile = await Profile.findOneAndUpdate(
            { userId: user._id.toString() },
            { 
                $set: { 
                    interests: structuredInterests 
                } 
            },
            { 
                new: true,
                upsert: true,
                setDefaultsOnInsert: true
            }
        );
        
        console.log('[POST /upload/interests] Profile updated successfully:', profile._id);
        
        res.status(200).json({ 
            message: "Interests updated successfully", 
            interests: profile.interests 
        });
    } catch (err) {
        console.error('[POST /upload/interests] Error:', err);
        res.status(500).json({ 
            message: "Failed to update interests", 
            error: err.message 
        });
    }
});

export default router;