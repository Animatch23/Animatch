import express from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const router = express.Router();

/**
 * @route   POST /google
 * @desc    Authenticate user via Google Sign-In token and create a session token
 */
router.post("/google", async (req, res) => {
    try {
        console.log("Loaded ENV:", {
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "✅ Set" : "❌ Missing",
        });

        const { code } = req.body;
        console.log("📝 Received code:", code);

        if (!code) {
            return res.status(400).json({ message: "Authorization code is required" });
        }

        // Create a new client for each request with all parameters
        const client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            'postmessage' // Special redirect URI for popup/redirect flows
        );

        // Exchange authorization code for tokens
        const { tokens } = await client.getToken(code);
        
        console.log("🎟️ Got tokens:", { id_token: tokens.id_token ? "✅" : "❌" });
        
        const idToken = tokens.id_token;

        //verify google token using google's library
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const email = payload.email;

        console.log("👤 User email:", email);

        //restricts to DLSU accs only
        if (!email.endsWith("@dlsu.edu.ph")) {
            return res.status(403).json({ message: "Access denied: not a DLSU email" });
        }

        //generates session JWT valid for 24hrs
        const sessionToken = jwt.sign(
            { email, name: payload.name, picture: payload.picture },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        console.log("✅ Session token created");
        res.json({ token: sessionToken });
    } catch (err) {
        console.error("Google authentication error:", err);
        res.status(401).json({ message: "Invalid Google token", error: err.message });
    }
});

export default router;