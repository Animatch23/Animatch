import { test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker";
import { mockSession, login, completeInterestSetupRandom } from "../helpers/login.js";


test.describe("next chat button tests", () => {
    test.beforeEach(async ({page})=>{
        await mockSession(page);
        await login(page);

        await page.goto("http://localhost:3000/terms");
        await page.getByText("Accept & Continue").click();
    })

    test("error for username shorter than 3 characters",async ({page})=>{
        try{
            const username = "hi";
            await page.locator('input[placeholder="Username *"]').fill(username);
            await page.getByRole("button", { name: "Continue" }).click();
            await expect(page.locator('p:has-text("Username must be at least 3 characters")')).toBeVisible();
            
        }finally{
            page.close();
        }

    })
        test("reject invalid file type",async ({page})=>{
        try{
            const invalidFile = Buffer.from("This is not an image");
            
            // Find the file input and upload the invalid file
            const fileInput = page.locator('input[accept="image/*"]');
            await fileInput.setInputFiles({
                name: "test.txt",
                mimeType: "text/plain",
                buffer: invalidFile
            });
            await expect(page.locator('p:has-text("Please select a valid image file")')).toBeVisible();
        }finally{
            page.close();
        }

    })
    test("reject invalid file size",async ({page})=>{
        try{
            const invalidImageFile = Buffer.alloc(6 * 1024 * 1024);
            
            // Find the file input and upload the invalid file
            const fileInput = page.locator('input[accept="image/*"]');
            await fileInput.setInputFiles({
                name: "test.txt",
                mimeType: "text/plain",
                buffer: invalidImageFile
            });
            await expect(page.locator('p:has-text("Image must be less than 5MB")')).toBeVisible();
        }finally{
            page.close();
        }

    })
test("accept username with 3 or more characters", async ({ page }) => {
    try {
        const username = "validuser123";
        await page.locator('input[placeholder="Username *"]').fill(username);
        await page.getByRole("button", { name: "Continue" }).click();
        
        // Should move to next step (interests page)
        await expect(page.locator('label:has-text("Your Course / Major")')).toBeVisible();
        
    } finally {
        await page.close();
    }
})

test("accept valid image file (jpg, png, gif under 5MB)", async ({ page }) => {
    try {
        // First set username
        const username = "validuser124";
        await page.locator('input[placeholder="Username *"]').fill(username);

        
        // Create a valid image file (100KB jpg)
        const validImageFile = Buffer.alloc(100 * 1024);
        
        const fileInput = page.locator('input[accept="image/*"]');
        await fileInput.setInputFiles({
            name: "profile.jpg",
            mimeType: "image/jpeg",
            buffer: validImageFile
        });
        
        await page.getByRole("button", { name: "Continue" }).click();
        await expect(page.locator('label:has-text("Your Course / Major")')).toBeVisible();
        
    } finally {
        await page.close();
    }
})

test("accept valid png file", async ({ page }) => {
    try {
        const username = "validuser125";
        await page.locator('input[placeholder="Username *"]').fill(username);
        
        const validImageFile = Buffer.alloc(2 * 1024 * 1024); // 2MB
        
        const fileInput = page.locator('input[accept="image/*"]');
        await fileInput.setInputFiles({
            name: "profile.png",
            mimeType: "image/png",
            buffer: validImageFile
        });
        await page.getByRole("button", { name: "Continue" }).click();        
        await expect(page.locator('label:has-text("Your Course / Major")')).toBeVisible();
        
    } finally {
        await page.close();
    }
})

test("accept valid jpg file", async ({ page }) => {
    try {
        const username = "validuser126";
        await page.locator('input[placeholder="Username *"]').fill(username);
        
        const validImageFile = Buffer.alloc(2 * 1024 * 1024); // 2MB
        
        const fileInput = page.locator('input[accept="image/*"]');
        await fileInput.setInputFiles({
            name: "profile.jpg",
            mimeType: "image/jpeg",
            buffer: validImageFile
        });
        await page.getByRole("button", { name: "Continue" }).click();        
        await expect(page.locator('label:has-text("Your Course / Major")')).toBeVisible();
        
    } finally {
        await page.close();
    }
})

test("accept valid gif file", async ({ page }) => {
    try {
        const username = "validuser127";
        await page.locator('input[placeholder="Username *"]').fill(username);

        
        const validImageFile = Buffer.alloc(3 * 1024 * 1024); // 3MB
        
        const fileInput = page.locator('input[accept="image/*"]');
        await fileInput.setInputFiles({
            name: "profile.gif",
            mimeType: "image/gif",
            buffer: validImageFile
        });
        await page.getByRole("button", { name: "Continue" }).click();
        await expect(page.locator('label:has-text("Your Course / Major")')).toBeVisible();
        
    } finally {
        await page.close();
    }
})
});