import { jest } from "@jest/globals";

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.download = jest.fn().mockReturnValue(res);
  return res;
};

describe("admin backup routes", () => {
  let router;
  let fs;
  let mockCreateBackup;
  let mockListBackups;
  let mockFindBackupById;
  let mockGetLatestBackup;
  let mockResolveBackupPath;
  let mockRestoreFromFile;
  let mockRestoreFromBackupRecord;
  let mockRestoreLatestBackup;
  let mockGetSchedulerStatus;

  const getRouteHandler = (method, path) => {
    const layer = router.stack.find(
      (l) => l.route && l.route.path === path && l.route.methods[method]
    );
    if (!layer) {
      throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
    }
    const handlers = layer.route.stack;
    return handlers[handlers.length - 1].handle;
  };

  beforeAll(async () => {
    jest.resetModules();

    ({ default: fs } = await import("../src/utils/fs.js"));

    mockCreateBackup = jest.fn();
    mockListBackups = jest.fn();
    mockFindBackupById = jest.fn();
    mockGetLatestBackup = jest.fn();
    mockResolveBackupPath = jest.fn((filename) => `/mock/${filename}`);
    mockRestoreFromFile = jest.fn();
    mockRestoreFromBackupRecord = jest.fn();
    mockRestoreLatestBackup = jest.fn();
    mockGetSchedulerStatus = jest.fn(() => ({ disabled: false }));

    jest.unstable_mockModule("../src/middleware/authSuperAdmin.js", () => ({
      default: (req, res, next) => {
        req.superAdmin = { email: "admin@test.com" };
        next();
      }
    }));

    jest.unstable_mockModule("../src/services/backupService.js", () => ({
      createBackup: mockCreateBackup,
      listBackups: mockListBackups,
      findBackupById: mockFindBackupById,
      getLatestBackup: mockGetLatestBackup,
      resolveBackupPath: mockResolveBackupPath,
      getBackupDirectory: jest.fn(),
      computeChecksum: jest.fn(),
      default: {}
    }));

    jest.unstable_mockModule("../src/services/restoreService.js", () => ({
      restoreFromFile: mockRestoreFromFile,
      restoreFromBackupRecord: mockRestoreFromBackupRecord,
      restoreLatestBackup: mockRestoreLatestBackup,
      default: {}
    }));

    jest.unstable_mockModule("../src/scheduler.js", () => ({
      getSchedulerStatus: mockGetSchedulerStatus,
      default: { getSchedulerStatus: mockGetSchedulerStatus }
    }));

    ({ default: router } = await import("../src/routes/adminBackupRoutes.js"));
  });

  afterAll(() => {
    jest.resetModules();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    fs.__reset();
    mockResolveBackupPath.mockImplementation((filename) => `/mock/${filename}`);
    mockGetSchedulerStatus.mockReturnValue({ disabled: false });
  });

  it("creates manual backups", async () => {
    const handler = getRouteHandler("post", "/admin/backup/manual");
    const req = { superAdmin: { email: "admin@test.com" } };
    const res = createRes();

    mockCreateBackup.mockResolvedValue({ id: "backup-1" });

    await handler(req, res);

    expect(mockCreateBackup).toHaveBeenCalledWith("admin@test.com");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: "Backup created", backup: { id: "backup-1" } });
  });

  it("lists backups", async () => {
    const handler = getRouteHandler("get", "/admin/backup");
    const req = { query: {}, superAdmin: {} };
    const res = createRes();

    mockListBackups.mockResolvedValue([{ filename: "a" }]);

    await handler(req, res);

    expect(mockListBackups).toHaveBeenCalledWith(25);
    expect(res.json).toHaveBeenCalledWith({ backups: [{ filename: "a" }] });
  });

  it("downloads a backup file when requested", async () => {
    const handler = getRouteHandler("get", "/admin/backup");
    const req = { query: { id: "1", download: "true" }, superAdmin: {} };
    const res = createRes();

    const record = { id: "1", filename: "file.jsonl.gz", path: "" };
    mockFindBackupById.mockResolvedValue(record);
    const fallbackPath = `/mock/${record.filename}`;
    mockResolveBackupPath.mockReturnValue(fallbackPath);
    fs.__setFile(fallbackPath, "payload");

    await handler(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.download).toHaveBeenCalledWith(fallbackPath, record.filename);
  });

  it("restores from an uploaded file", async () => {
    const handler = getRouteHandler("post", "/admin/backup/restore");
    const req = {
      body: {},
      file: { path: "/tmp/upload.jsonl" },
      superAdmin: {}
    };
    const res = createRes();

    mockRestoreFromFile.mockResolvedValue({ collectionsRestored: ["users"], documentsCount: 1 });

    await handler(req, res);

    expect(mockRestoreFromFile).toHaveBeenCalledWith({ filePath: "/tmp/upload.jsonl" });
    expect(res.json).toHaveBeenCalledWith({ message: "Database restored", report: { collectionsRestored: ["users"], documentsCount: 1 } });
  });

  it("restores using backupId", async () => {
    const handler = getRouteHandler("post", "/admin/backup/restore");
    const req = {
      body: { backupId: "123" },
      superAdmin: {}
    };
    const res = createRes();

    mockFindBackupById.mockResolvedValue({ id: "123" });
    mockRestoreFromBackupRecord.mockResolvedValue({ ok: true });

    await handler(req, res);

    expect(mockFindBackupById).toHaveBeenCalledWith("123");
    expect(mockRestoreFromBackupRecord).toHaveBeenCalledWith({ id: "123" });
  });

  it("restores the latest backup when requested", async () => {
    const handler = getRouteHandler("post", "/admin/backup/restore");
    const req = {
      body: { useLatest: "true" },
      superAdmin: {}
    };
    const res = createRes();

    mockRestoreLatestBackup.mockResolvedValue({ ok: true });

    await handler(req, res);

    expect(mockRestoreLatestBackup).toHaveBeenCalled();
  });

  it("returns scheduler status with latest backup", async () => {
    const handler = getRouteHandler("get", "/admin/backup/status");
    const req = { superAdmin: {} };
    const res = createRes();

    mockGetLatestBackup.mockResolvedValue({ filename: "last" });

    await handler(req, res);

    expect(mockGetSchedulerStatus).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      scheduler: { disabled: false },
      latestBackup: { filename: "last" }
    });
  });
});
