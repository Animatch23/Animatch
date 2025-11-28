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
        
        // Build update payload
        const updatePayload = {
            $set: {
                username: userData.username,
            },
            $setOnInsert: {
                email: userData.email,
            },
        };

        // Add profile picture to $set if provided, otherwise to $setOnInsert
        if (profilePicture) {
            updatePayload.$set.profilePicture = profilePicture;
        } else {
            updatePayload.$setOnInsert.profilePicture = null;
        }

        // If acceptTerms flag is set, include terms acceptance in $set
        if (acceptTermsFlag) {
            updatePayload.$set.termsAccepted = true;
            updatePayload.$set.termsAcceptedDate = new Date();
            updatePayload.$set.termsAcceptedVersion = "1.0";
        }

        const updateResult = await User.findOneAndUpdate(
            { email: userData.email },
            updatePayload,
            { new: true, upsert: true, setDefaultsOnInsert: true, rawResult: true }
        );

        const updatedUser = updateResult.value;
        const updatedExisting = Boolean(updateResult?.lastErrorObject?.updatedExisting);

        res.status(updatedExisting ? 200 : 201).json({
            message: updatedExisting ? "User profile updated" : "User created",
            user: updatedUser,
        });
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
 * POST /upload/update-profile
 * Updates user profile with interests
 * @route POST /update-profile
 * @param {string} email - Required email to find user
 * @param {Object} interests - Structured interests object { course, dorm, organizations }
 */
const updateProfileHandler = async (req, res) => {
    try {
        const { email, interests } = req.body;
        
        console.log('[POST /upload/update-profile] Request received:', { email, interests });
        
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            console.log('[POST /upload/update-profile] User not found:', email);
            return res.status(404).json({ message: "User not found" });
        }

        // Validate and structure profile data
        const updateData = {};
        
        if (interests?.course) updateData.course = interests.course;
        if (interests?.dorm || interests?.housing) updateData.housing = interests.dorm || interests.housing;
        if (Array.isArray(interests?.organizations)) updateData.organizations = interests.organizations;
        
        // Update User model (Source of Truth)
        const updatedUser = await User.findOneAndUpdate(
            { email },
            { 
                $set: updateData
            },
            { 
                new: true
            }
        );
        
        console.log('[POST /upload/update-profile] User updated successfully:', updatedUser._id);
        console.log('Saved profile data:', { 
            course: updatedUser.course, 
            housing: updatedUser.housing, 
            organizations: updatedUser.organizations 
        });
        
        res.status(200).json({ 
            message: "Profile updated successfully", 
            user: {
                course: updatedUser.course,
                housing: updatedUser.housing,
                organizations: updatedUser.organizations,
                interests: updatedUser.interests
            }
        });
    } catch (err) {
        console.error('[POST /upload/update-profile] Error:', err);
        res.status(500).json({ 
            message: "Failed to update profile", 
            error: err.message 
        });
    }
};

// Handler for updating interests array (hobby interests, not profile data)
const updateInterestsHandler = async (req, res) => {
    try {
        const { email, interests } = req.body;
        console.log('[POST /upload/update-interests] Email:', email, 'Interests:', interests);

        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        if (!Array.isArray(interests)) {
            return res.status(400).json({ error: "Interests must be an array" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Update the interests array
        user.interests = interests;
        await user.save();

        console.log('[POST /upload/update-interests] Interests updated successfully for user:', user._id);
        console.log('New interests:', user.interests);

        res.status(200).json({ 
            message: "Interests updated successfully",
            interests: user.interests
        });
    } catch (err) {
        console.error('[POST /upload/update-interests] Error:', err);
        res.status(500).json({ 
            message: "Failed to update interests", 
            error: err.message 
        });
    }
};

router.post('/update-profile', updateProfileHandler);
router.post('/update-interests', updateInterestsHandler);

// Legacy route support (redirects to update-profile logic if needed, or just handles interests)
router.post('/interests', updateProfileHandler);

/**
 * POST /check-username
 * Checks if a username is available for registration
 * @route POST /check-username
 * @param {string} username - Required username to check
 * @returns {Object} 200 - Availability status
 * @returns {Object} 400 - Missing username
 */
router.post('/check-username', async (req, res) => {
    try {
        const { username } = req.body;

        if (!username || username.trim() === '') {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Case-insensitive check
        const existingUser = await User.findOne({
            username: { $regex: new RegExp(`^${username.trim()}$`, 'i') }
        });

        const isAvailable = !existingUser;

        res.status(200).json({ isAvailable });
    } catch (err) {
        console.error('[POST /check-username] Error:', err);
        res.status(500).json({ error: 'Failed to check username availability' });
    }
});

export default router;