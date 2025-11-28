import fs from "../utils/fs.js";
import path from "path";
import zlib from "zlib";
import readline from "readline";
import mongoose from "mongoose";
import { EJSON } from "bson";
import Backup from "../models/backup.js";
import { computeChecksum, getBackupDirectory, resolveBackupPath } from "./backupService.js";

const isGzipFile = (filePath) => filePath.endsWith(".gz");

const openBackupStream = (filePath) => {
    const source = fs.createReadStream(filePath);
    return isGzipFile(filePath) ? source.pipe(zlib.createGunzip()) : source;
};

const readBackupEntries = async function* (filePath) {
    const stream = openBackupStream(filePath);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed) {
            continue;
        }

        let parsed;
        try {
            parsed = JSON.parse(trimmed);
        } catch (error) {
            rl.close();
            throw new Error(`Invalid backup file format: ${error.message}`);
        }

        if (!parsed.collectionName || !Array.isArray(parsed.documents)) {
            rl.close();
            throw new Error("Backup data missing required fields");
        }

        yield {
            collectionName: parsed.collectionName,
            documents: parsed.documents.map((doc) => EJSON.deserialize(doc))
        };
    }

    rl.close();
};

const wipeExistingCollections = async () => {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    for (const collection of collections) {
        if (collection.name.startsWith("system.")) {
            continue;
        }

        await db.collection(collection.name).deleteMany({});
    }
};

const resolveRecordPath = (record) => {
    if (record.path && fs.existsSync(record.path)) {
        return record.path;
    }

    return resolveBackupPath(record.filename);
};

export const restoreFromFile = async ({ filePath, expectedChecksum }) => {
    if (!fs.existsSync(filePath)) {
        throw new Error("Backup file not found");
    }

    if (expectedChecksum) {
        const checksum = await computeChecksum(filePath);
        if (checksum !== expectedChecksum) {
            throw new Error("Backup checksum mismatch");
        }
    }

    if (!mongoose.connection?.db) {
        throw new Error("MongoDB connection is not ready");
    }

    await wipeExistingCollections();

    const db = mongoose.connection.db;
    const report = {
        collectionsRestored: [],
        documentsCount: 0
    };

    for await (const entry of readBackupEntries(filePath)) {
        const collection = db.collection(entry.collectionName);
        if (entry.documents.length > 0) {
            await collection.insertMany(entry.documents, { ordered: true });
            report.documentsCount += entry.documents.length;
        }
        report.collectionsRestored.push(entry.collectionName);
    }

    return report;
};

export const restoreFromBackupRecord = async (backupRecord) => {
    if (!backupRecord) {
        throw new Error("Backup metadata not found");
    }

    const filePath = resolveRecordPath(backupRecord);
    return restoreFromFile({ filePath, expectedChecksum: backupRecord.checksum });
};

export const restoreLatestBackup = async () => {
    const record = await Backup.findOne({ status: "completed" }).sort({ createdAt: -1 });
    if (!record) {
        throw new Error("No completed backups available to restore");
    }
    return restoreFromBackupRecord(record);
};

export const ensureLocalBackupFile = async (uploadedPath) => {
    const targetDir = getBackupDirectory();
    await fs.promises.mkdir(targetDir, { recursive: true });

    const targetPath = path.join(targetDir, path.basename(uploadedPath));
    await fs.promises.copyFile(uploadedPath, targetPath);
    return targetPath;
};

export default {
    restoreFromFile,
    restoreFromBackupRecord,
    restoreLatestBackup,
    ensureLocalBackupFile
};
