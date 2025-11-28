import mongoose from "mongoose";

const superAdminSchema = new mongoose.Schema({
	email: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
		trim: true
	},
	displayName: {
		type: String,
		default: "Super Admin"
	},
	apiKeyHash: {
		type: String,
		required: true
	},
	isActive: {
		type: Boolean,
		default: true
	},
	notes: {
		type: String,
		default: ""
	}
}, {
	timestamps: true
});

superAdminSchema.set("toJSON", {
	virtuals: true,
	versionKey: false,
	transform: (_, doc) => {
		delete doc.apiKeyHash;
		return doc;
	}
});

const SuperAdmin = mongoose.models.SuperAdmin || mongoose.model("SuperAdmin", superAdminSchema);
export default SuperAdmin;
