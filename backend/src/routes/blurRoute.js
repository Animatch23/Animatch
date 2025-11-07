import express from "express";
import multer from "multer";
import sharp from "sharp";

const router = express.Router();

//configures multer to store files in memory instead of disk
const storage = multer.memoryStorage();

//file filter function to allow only JPG and PNG file formats
const fileFilter = (req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
        cb(null, true);
    } else {
        cb(new Error("Only JPG and PNG files are allowed!"), false);
    }
};

//initializes multer with storage and file filter
const upload = multer({ storage, fileFilter });

/**
 * @route   POST /api/blur/profile-pic
 * @desc    Blurs a JPG/PNG profile picture before saving or displaying
 * @param {File} picture - profile picture to be blurred
 * @returns {Object} 200 - Picture blurred successfully
 * @returns {Object} 500 - Failed to blur picture
 */
router.post("/profile-pic", upload.single("picture"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No picture provided" });
        }

        const blurredBuffer = await sharp(req.file.buffer).blur(20).toBuffer();
        const blurredBase64 = blurredBuffer.toString("base64");

        res.json({
        success: true,
        message: "Picture blurred successfully",
        blurredImage: blurredBase64,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to blur picture" });
    }
});

export default router;
