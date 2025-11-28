import { jest, beforeEach, beforeAll } from "@jest/globals";

process.env.NODE_ENV = "test";
if (typeof process.env.DISABLE_BACKUP_CRON === "undefined") {
  process.env.DISABLE_BACKUP_CRON = "true";
}

let fsMock;
let cronMock;

beforeAll(async () => {
  const fsImport = await import("./src/utils/fs.js");
  const cronImport = await import("node-cron");
  fsMock = fsImport.default ?? fsImport;
  cronMock = cronImport.default ?? cronImport;
});

beforeEach(() => {
  jest.clearAllMocks();
  fsMock?.__reset?.();
  cronMock?.__reset?.();
});
