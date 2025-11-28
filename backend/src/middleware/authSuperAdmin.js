import bcrypt from "bcryptjs";
import SuperAdmin from "../models/superadmin.js";

const HEADER_KEY = "x-admin-key";

export const authSuperAdmin = async (req, res, next) => {
    try {
        const providedKey = req.get(HEADER_KEY)?.trim();

        if (!providedKey) {
            return res.status(401).json({ message: "Missing admin key header" });
        }

        const admins = await SuperAdmin.find({ isActive: true });

        for (const admin of admins) {
            const isMatch = await bcrypt.compare(providedKey, admin.apiKeyHash);
            if (isMatch) {
                req.superAdmin = {
                    id: admin._id,
                    email: admin.email,
                    displayName: admin.displayName
                };
                return next();
            }
        }

        return res.status(403).json({ message: "Invalid admin key" });
    } catch (error) {
        console.error("[SuperAdminAuth]", error);
        return res.status(500).json({ message: "Super admin authentication failed" });
    }
};

export default authSuperAdmin;
