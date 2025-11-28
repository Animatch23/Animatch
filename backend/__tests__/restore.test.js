import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { EJSON } from "bson";
import zlib from "zlib";
import fs from "../src/utils/fs.js";
import path from "path";

let restoreService;
let backupService;
let Backup;
let mongo;

describe("restore service", () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: "restore-service" });
    restoreService = await import("../src/services/restoreService.js");
    backupService = await import("../src/services/backupService.js");
    ({ default: Backup } = await import("../src/models/backup.js"));
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
    fs.__reset();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  const writeBackupFile = (filename, payloads) => {
    const filePath = path.join(process.cwd(), "backups", filename);
    const content = payloads.map((payload) => JSON.stringify(payload)).join("\n");
    const buffer = filename.endsWith(".gz") ? zlib.gzipSync(content) : content;
    fs.__setFile(filePath, buffer);
    return filePath;
  };

  it("restores documents from a jsonl backup file", async () => {
    const db = mongoose.connection.db;
    await db.collection("users").insertOne({ email: "old@test.com" });
    await db.collection("logs").insertOne({ event: "old" });

    const doc = { _id: new mongoose.Types.ObjectId(), email: "restored@test.com" };
    const backupPath = writeBackupFile("manual.jsonl", [
      {
        collectionName: "users",
        documents: [EJSON.serialize(doc)]
      },
      {
        collectionName: "logs",
        documents: []
      }
    ]);

    const report = await restoreService.restoreFromFile({ filePath: backupPath });

    expect(report.collectionsRestored).toEqual(["users", "logs"]);
    expect(report.documentsCount).toBe(1);

    const users = await db.collection("users").find({}).toArray();
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe("restored@test.com");
  });

  it("throws when checksum does not match", async () => {
    const backupPath = writeBackupFile("checksum.jsonl", [
      { collectionName: "users", documents: [] }
    ]);

    await expect(
      restoreService.restoreFromFile({ filePath: backupPath, expectedChecksum: "invalid" })
    ).rejects.toThrow("Backup checksum mismatch");
  });

  it("restores using the latest completed backup metadata", async () => {
    const filename = "latest.jsonl.gz";
    const filePath = writeBackupFile(filename, [
      {
        collectionName: "messages",
        documents: [EJSON.serialize({ _id: new mongoose.Types.ObjectId(), body: "hello" })]
      }
    ]);

    const checksum = await backupService.computeChecksum(filePath);
    await Backup.create({
      filename,
      checksum,
      status: "completed",
      path: ""
    });

    const report = await restoreService.restoreLatestBackup();
    expect(report.collectionsRestored).toEqual(["messages"]);

    const messageCount = await mongoose.connection.db.collection("messages").countDocuments();
    expect(messageCount).toBe(1);
  });
});
