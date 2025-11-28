import mongoose from "mongoose";

const backupSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true,
        unique: true
    },
    checksum: {
        type: String,
        default: ""
    },
    size: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ["running", "completed", "failed"],
        default: "running"
    },
    initiatedBy: {
        type: String,
        default: "system"
    },
    path: {
        type: String,
        default: ""
    },
    error: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

backupSchema.set("toJSON", {
    virtuals: true,
    versionKey: false
});

const Backup = mongoose.models.Backup || mongoose.model("Backup", backupSchema);
export default Backup;
