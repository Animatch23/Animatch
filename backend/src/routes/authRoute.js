import express from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const router = express.Router();

// Test route to verify auth routes are loaded
router.get("/test", (req, res) => {
    res.json({ message: "Auth routes are working!" });
});

/**
 * @route   POST /google
 * @desc    Authenticate user via Google Sign-In token and create a session token
 */
router.post("/google", async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ message: "Authorization code is required" });
        }

        console.log("Received auth code, exchanging with Google...");
        console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + "...");
        console.log("GOOGLE_REDIRECT_URI:", process.env.GOOGLE_REDIRECT_URI);

        // Create a new client for each request with all parameters
        const client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        // Exchange authorization code for tokens
        console.log("Calling getToken...");
        const { tokens } = await client.getToken(code);
        console.log("Got tokens from Google");
        
        const idToken = tokens.id_token;

        // Verify google token using google's library
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const email = payload.email;

        console.log("Authenticated user:", email);

        // Restricts to DLSU accs only
        if (!email.endsWith("@dlsu.edu.ph")) {
            console.log("Rejected non-DLSU email:", email);
            return res.status(403).json({ message: "Access denied: not a DLSU email" });
        }

        // Generates session JWT valid for 24hrs
        const sessionToken = jwt.sign(
            { email, name: payload.name, picture: payload.picture },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        console.log("Session token created successfully");
        res.json({ token: sessionToken, email: email});
    } catch (err) {
        console.error("Google authentication error:", err);
        console.error("Error details:", {
            message: err.message,
            stack: err.stack,
            code: err.code
        });
        res.status(401).json({ 
            message: "Invalid Google token", 
            error: err.message,
            details: process.env.NODE_ENV === 'production' ? undefined : err.stack
        });
    }
});

export default router;