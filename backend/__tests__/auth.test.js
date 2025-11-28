import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcryptjs";
import { jest } from "@jest/globals";

import authSuperAdmin from "../src/middleware/authSuperAdmin.js";
import SuperAdmin from "../src/models/superadmin.js";

describe("authSuperAdmin middleware", () => {
  let mongo;

  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: "auth-super-admin" });
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it("rejects requests without admin header", async () => {
    const req = { get: () => null };
    const res = mockRes();
    const next = jest.fn();

    await authSuperAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing admin key header" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects invalid keys", async () => {
    await SuperAdmin.create({
      email: "admin@test.com",
      apiKeyHash: await bcrypt.hash("valid", 10),
      displayName: "Admin"
    });

    const req = { get: () => "invalid" };
    const res = mockRes();
    const next = jest.fn();

    await authSuperAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid admin key" });
    expect(next).not.toHaveBeenCalled();
  });

  it("allows valid super admin keys", async () => {
    const key = "super-secret";
    await SuperAdmin.create({
      email: "admin@test.com",
      apiKeyHash: await bcrypt.hash(key, 10),
      displayName: "Admin"
    });

    const req = { get: () => key };
    const res = mockRes();
    const next = jest.fn();

    await authSuperAdmin(req, res, next);

    expect(req.superAdmin.email).toBe("admin@test.com");
    expect(next).toHaveBeenCalled();
  });
});
