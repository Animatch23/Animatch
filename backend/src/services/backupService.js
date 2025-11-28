import fs from "fs";
import path from "path";
import zlib from "zlib";
import crypto from "crypto";
import { once } from "events";
import mongoose from "mongoose";
import { EJSON } from "bson";
import Backup from "../models/backup.js";

const BACKUP_DIR = path.resolve(process.cwd(), "backups");
const SYSTEM_COLLECTION_PREFIX = "system.";

const ensureDirectory = async (dirPath) => {
    await fs.promises.mkdir(dirPath, { recursive: true });
};

export const getBackupDirectory = () => BACKUP_DIR;

export const computeChecksum = (filePath) => new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const readStream = fs.createReadStream(filePath);

    readStream.on("data", (chunk) => hash.update(chunk));
    readStream.on("error", reject);
    readStream.on("end", () => resolve(hash.digest("hex")));
});

const serializeDocuments = (documents) => documents.map((doc) => EJSON.serialize(doc));

export const listBackups = (limit = 25) => Backup.find().sort({ createdAt: -1 }).limit(limit).lean();

export const findBackupById = (id) => Backup.findById(id);

export const getLatestBackup = () => Backup.findOne({ status: "completed" }).sort({ createdAt: -1 });

export const resolveBackupPath = (filename) => path.join(BACKUP_DIR, filename);

export const createBackup = async (initiatedBy = "system") => {
    if (!mongoose.connection?.db) {
        throw new Error("MongoDB connection is not ready");
    }

    await ensureDirectory(BACKUP_DIR);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${timestamp}.jsonl.gz`;
    const targetPath = resolveBackupPath(filename);

    const backupRecord = await Backup.create({
        filename,
        path: targetPath,
        status: "running",
        initiatedBy
    });

    try {
        const gzip = zlib.createGzip();
        const writeStream = fs.createWriteStream(targetPath);
        gzip.pipe(writeStream);

        const collections = await mongoose.connection.db.listCollections().toArray();

        for (const collection of collections) {
            if (collection.name.startsWith(SYSTEM_COLLECTION_PREFIX)) {
                continue;
            }

            const documents = await mongoose.connection.db.collection(collection.name).find({}).toArray();
            const payload = JSON.stringify({
                collectionName: collection.name,
                documents: serializeDocuments(documents)
            });

            gzip.write(`${payload}\n`);
        }

        gzip.end();
        await once(writeStream, "close");

        const stats = await fs.promises.stat(targetPath);
        const checksum = await computeChecksum(targetPath);

        backupRecord.status = "completed";
        backupRecord.size = stats.size;
        backupRecord.checksum = checksum;
        await backupRecord.save();

        return backupRecord.toJSON();
    } catch (error) {
        backupRecord.status = "failed";
        backupRecord.error = error.message;
        await backupRecord.save();
        throw error;
    }
};

export default {
    createBackup,
    listBackups,
    findBackupById,
    getLatestBackup,
    resolveBackupPath,
    getBackupDirectory,
    computeChecksum
};
