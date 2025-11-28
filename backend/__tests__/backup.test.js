import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import zlib from "zlib";
import fs from "../src/utils/fs.js";

describe("backup service", () => {
  let mongo;
  let backupService;
  let Backup;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: "backup-service" });
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

  it("creates a compressed backup file with metadata and checksum", async () => {
    const db = mongoose.connection.db;
    await db.collection("users").insertMany([
      { email: "alpha@test.com", username: "alpha" },
      { email: "beta@test.com", username: "beta" }
    ]);

    const { createBackup, resolveBackupPath, computeChecksum } = backupService;

    const backup = await createBackup("manual@test.com");

    expect(backup.status).toBe("completed");
    expect(backup.initiatedBy).toBe("manual@test.com");
    expect(backup.filename).toMatch(/\.jsonl\.gz$/);

    const storedMetadata = await Backup.findOne({ filename: backup.filename }).lean();
    expect(storedMetadata).toMatchObject({
      checksum: backup.checksum,
      status: "completed"
    });
    expect(storedMetadata.size).toBeGreaterThan(0);

    const backupPath = resolveBackupPath(backup.filename);
    const compressedBuffer = fs.__files.get(backupPath);
    const fileContents = compressedBuffer ? zlib.gunzipSync(compressedBuffer).toString("utf8") : "";
    expect(fileContents).toContain("\"collectionName\":\"users\"");

    const checksum = await computeChecksum(backupPath);
    expect(checksum).toBe(backup.checksum);
  });

  it("lists backups in reverse chronological order", async () => {
    const { createBackup, listBackups } = backupService;
    const db = mongoose.connection.db;
    await db.collection("entries").insertOne({ label: "first" });

    const firstBackup = await createBackup("first");
    await Backup.updateOne({ _id: firstBackup._id }, { createdAt: new Date("2025-01-01T00:00:00Z") });

    const secondBackup = await createBackup("second");
    await Backup.updateOne({ _id: secondBackup._id }, { createdAt: new Date("2025-01-02T00:00:00Z") });

    const backups = await listBackups(1);
    expect(backups).toHaveLength(1);
    expect(backups[0].initiatedBy).toBe("second");
  });
});

describe("backup scheduler", () => {
  let createBackupSpy;
  let schedulerModule;
  let cronMock;

  beforeAll(async () => {
    jest.resetModules();
    createBackupSpy = jest.fn().mockResolvedValue({ id: "mock-id" });

    jest.unstable_mockModule("../src/services/backupService.js", () => ({
      createBackup: createBackupSpy,
      listBackups: jest.fn(),
      findBackupById: jest.fn(),
      getLatestBackup: jest.fn(),
      resolveBackupPath: jest.fn(),
      getBackupDirectory: jest.fn(),
      computeChecksum: jest.fn(),
      default: {}
    }));

    schedulerModule = await import("../src/scheduler.js");
    cronMock = await import("node-cron");
  });

  afterAll(() => {
    process.env.DISABLE_BACKUP_CRON = "true";
    jest.resetModules();
  });

  beforeEach(() => {
    cronMock.__reset();
    createBackupSpy.mockClear();
    process.env.DISABLE_BACKUP_CRON = "false";
  });

  it("schedules a daily cron job and triggers backups", async () => {
    const task = schedulerModule.startBackupScheduler();
    expect(task).toBeTruthy();

    const scheduledTasks = cronMock.__getScheduledTasks();
    expect(scheduledTasks).toHaveLength(1);
    expect(scheduledTasks[0].expression).toBe("0 2 * * *");

    await scheduledTasks[0].handler();
    expect(createBackupSpy).toHaveBeenCalledWith("scheduler");

    const status = schedulerModule.getSchedulerStatus();
    expect(status.disabled).toBe(false);
    expect(status.lastRunAt).toBeTruthy();
    expect(status.lastSuccess.backupId).toBe("mock-id");
  });
});
