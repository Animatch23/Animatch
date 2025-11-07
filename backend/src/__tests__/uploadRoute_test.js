import mongoose from 'mongoose';
import { 
    validateEmailInput,
    validateUsernameInput,
    createProfilePictureObject, 
    createUserData 
} from '../routes/uploadRoute.js';

describe('Upload Route API Unit Tests', () => {
    describe('Tests for validateEmailInput()', () => {
        it('should pass validation with a valid email', () => {
            expect(() => validateEmailInput('test@dlsu.edu.ph')).not.toThrow();
            expect(validateEmailInput('test@dlsu.edu.ph')).toBe(true);
        });

        it('should throw an error when the email is missing', () => {
            expect(() => validateEmailInput(null)).toThrow('Email is required');
            expect(() => validateEmailInput(undefined)).toThrow('Email is required');
            expect(() => validateEmailInput('')).toThrow('Email is required');
        });
    });

    describe('Tests for validateUsernameInput()', () => {
        it('should pass validation with a valid username', () => {
            expect(() => validateUsernameInput('validuser')).not.toThrow();
            expect(validateUsernameInput('validuser')).toBe(true);
        });

        it('should throw an error when the username is missing', () => {
            expect(() => validateUsernameInput(null)).toThrow('Username is required');
            expect(() => validateUsernameInput(undefined)).toThrow('Username is required');
            expect(() => validateUsernameInput('')).toThrow('Username is required');
        });
    });

    describe('Tests for createProfilePictureObject()', () => {
        it('should return null when no file provided', () => {
            const result = createProfilePictureObject(null, 'test-uploads');
            expect(result).toBeNull();
        });

        it('should return profile picture object when file provided', () => {
            const mockFile = { filename: 'test-123.jpg' };
            const result = createProfilePictureObject(mockFile, 'test-uploads');
            
            expect(result).toEqual({
                url: '/test-uploads/test-123.jpg',
                isBlurred: true
            });
        });

        it('should use correct upload directory in URL', () => {
            const mockFile = { filename: 'image.png' };
            const result = createProfilePictureObject(mockFile, 'test-uploads');
            
            expect(result.url).toBe('/test-uploads/image.png');
        });
    });

    describe('Tests for createUserData()', () => {
        it('should create user data with profile picture', () => {
            const profilePicture = { url: '/uploads/test.jpg', isBlurred: true };
            const result = createUserData('test@dlsu.edu.ph', 'testuser', profilePicture);
            
            expect(result).toEqual({
                email: 'test@dlsu.edu.ph',
                username: 'testuser',
                profilePicture: profilePicture
            });
        });

        it('should create user data without profile picture', () => {
            const result = createUserData('test@dlsu.edu.ph', 'testuser', null);
            
            expect(result).toEqual({
                email: 'test@dlsu.edu.ph',
                username: 'testuser',
                profilePicture: null
            });
        });
    });
});

afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
});





// NOTE: I accidently wrote an integration test instead of a unit test, have fun QA team T-T
//       Y'all can delete or use this. 

// import request from "supertest";
// import app from "../server.js";
// import mongoose from "mongoose";
// import fs from "fs";
// import path from "path";

// const testUploadsDir = path.join(process.cwd(), "test-uploads");

// beforeAll(() => {
//     process.env.NODE_ENV = 'test';
// });

// describe("Upload API for Username / Pfp", () => {
//     it("should try to create a new user with a pfp", async () => {
//         const res = await request(app)
//             .post("/api/upload")
//             .field("username", "juan-with-pfp")
//             .attach("file", "src/__tests__/test_assets/test1.jpg");
        
//         expect(res.statusCode).toBe(201);
//         expect(res.body.user.username).toBe("juan-with-pfp");
//         expect(res.body.user.profilePicture).toHaveProperty("url");
//     });

//     it("should try to create a new user without a pfp", async () => {
//         const res = await request(app)
//         .post("/api/upload")
//         .field("username", "juan-no-pfp");

//         expect(res.statusCode).toBe(201);
//         expect(res.body.user.username).toBe("juan-no-pfp");
//         expect(res.body.user.profilePicture).toBeNull();
//     });
// });

// afterAll(async () => {
//     await mongoose.connection.close();

//     if (fs.existsSync(testUploadsDir)) {
//         fs.rmSync(testUploadsDir, { recursive: true, force: true });
//     }
// });