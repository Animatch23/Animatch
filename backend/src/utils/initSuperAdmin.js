import bcrypt from "bcryptjs";
import SuperAdmin from "../models/superadmin.js";

const DEFAULT_EMAIL = process.env.DEFAULT_SUPERADMIN_EMAIL || "superadmin@animatch.local";
const DEFAULT_KEY = process.env.DEFAULT_SUPERADMIN_KEY || "animatch-admin-key";
const DEFAULT_NAME = process.env.DEFAULT_SUPERADMIN_NAME || "Animatch SuperAdmin";

export const ensureDefaultSuperAdmin = async () => {
	const existingCount = await SuperAdmin.countDocuments();

	if (existingCount > 0) {
		return SuperAdmin.findOne();
	}

	const apiKeyHash = await bcrypt.hash(DEFAULT_KEY, 10);
	const admin = await SuperAdmin.create({
		email: DEFAULT_EMAIL.toLowerCase(),
		displayName: DEFAULT_NAME,
		apiKeyHash,
		notes: "Auto-generated default super admin"
	});

	console.log("[SuperAdmin] Default account seeded.");
	console.log(`[SuperAdmin] Use header ${"x-admin-key"}: ${DEFAULT_KEY}`);

	return admin;
};

export default ensureDefaultSuperAdmin;
