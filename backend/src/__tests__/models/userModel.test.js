import mongoose from 'mongoose';
import { connectTestDB, disconnectTestDB } from '../../utils/testDb.js';
import User from '../../models/userModel.js';

describe('User Model Tests', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  it('should create a user with default terms acceptance values', async () => {
    const userData = {
      email: 'test@example.com',
      // Add other required fields based on your schema
    };

    const newUser = await User.create(userData);
    expect(newUser).toBeDefined();
    expect(newUser.termsAccepted).toBe(false);
    expect(newUser.termsAcceptedDate).toBeNull();
    expect(newUser.termsAcceptedVersion).toBeNull();
  });

  it('should update terms acceptance fields', async () => {
    const user = await User.create({
      email: 'test@example.com',
      // Add other required fields
    });

    user.termsAccepted = true;
    user.termsAcceptedDate = new Date();
    user.termsAcceptedVersion = "1.0";
    await user.save();

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.termsAccepted).toBe(true);
    expect(updatedUser.termsAcceptedDate).toBeInstanceOf(Date);
    expect(updatedUser.termsAcceptedVersion).toBe("1.0");
  });
});

afterAll(async () => {
  await disconnectTestDB();
});