import express from "express";
import multer from "multer";
import fs from "../utils/fs.js";
import path from "path";
import authSuperAdmin from "../middleware/authSuperAdmin.js";
import { createBackup, listBackups, findBackupById, getLatestBackup, resolveBackupPath } from "../services/backupService.js";
import { restoreFromBackupRecord, restoreLatestBackup, restoreFromFile } from "../services/restoreService.js";
import { getSchedulerStatus } from "../scheduler.js";

const router = express.Router();
const uploadDirectory = path.resolve(process.cwd(), "uploads", "backups");
const ensureUploadDirectory = () => fs.promises.mkdir(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureUploadDirectory().then(() => cb(null, uploadDirectory)).catch((error) => cb(error));
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname) || ".jsonl";
        cb(null, `restore-${Date.now()}${extension}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: Number(process.env.MAX_BACKUP_UPLOAD_SIZE || 50 * 1024 * 1024)
    }
});

const sendDownload = (res, backupRecord) => {
    const candidatePath = backupRecord.path && fs.existsSync(backupRecord.path)
        ? backupRecord.path
        : resolveBackupPath(backupRecord.filename);

    if (!fs.existsSync(candidatePath)) {
        return res.status(404).json({ message: "Backup file missing on server" });
    }

    return res.download(candidatePath, backupRecord.filename);
};

router.post("/admin/backup/manual", authSuperAdmin, async (req, res) => {
    try {
        const metadata = await createBackup(req.superAdmin?.email || "manual");
        return res.status(201).json({ message: "Backup created", backup: metadata });
    } catch (error) {
        console.error("[BackupManual]", error);
        return res.status(500).json({ message: "Failed to create backup", error: error.message });
    }
});

router.get("/admin/backup", authSuperAdmin, async (req, res) => {
    try {
        const { id, download } = req.query;

        if (id && download === "true") {
            const record = await findBackupById(id);
            if (!record) {
                return res.status(404).json({ message: "Backup not found" });
            }
            return sendDownload(res, record);
        }

        const limit = Math.min(Number(req.query.limit) || 25, 100);
        const backups = await listBackups(limit);
        return res.json({ backups });
    } catch (error) {
        console.error("[BackupList]", error);
        return res.status(500).json({ message: "Failed to load backups", error: error.message });
    }
});

router.post("/admin/backup/restore", authSuperAdmin, upload.single("backup"), async (req, res) => {
    let uploadedPath;
    try {
        const { useLatest, backupId } = req.body;
        uploadedPath = req.file?.path;
        let report;

        if (uploadedPath) {
            report = await restoreFromFile({ filePath: uploadedPath });
        } else if (backupId) {
            const record = await findBackupById(backupId);
            report = await restoreFromBackupRecord(record);
        } else if (useLatest === "true" || useLatest === true) {
            report = await restoreLatestBackup();
        } else {
            return res.status(400).json({ message: "Provide a backup file, backupId, or set useLatest=true" });
        }

        return res.json({ message: "Database restored", report });
    } catch (error) {
        console.error("[BackupRestore]", error);
        return res.status(500).json({ message: "Failed to restore backup", error: error.message });
    } finally {
        if (uploadedPath) {
            fs.promises.unlink(uploadedPath).catch(() => {});
        }
    }
});

router.get("/admin/backup/status", authSuperAdmin, async (req, res) => {
    try {
        const scheduler = getSchedulerStatus();
        const latestBackup = await getLatestBackup();
        return res.json({ scheduler, latestBackup });
    } catch (error) {
        console.error("[BackupStatus]", error);
        return res.status(500).json({ message: "Failed to load backup status", error: error.message });
    }
});

export default router;
