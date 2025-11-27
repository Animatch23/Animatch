import { test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker";
import { mockSession, login, completeInterestSetupRandom } from "../helpers/login.js";

test.describe("next chat button tests", () => {
  test.describe.configure({
    repeatEach: 1,
    retries: 0,
  });

  const setupUserBeforeEach = async (page) => {
    console.log(`Setting up ${page}`)
    await mockSession(page);
    await login(page);

    await page.goto("http://localhost:3000/terms");
    await page.getByText("Accept & Continue").click();
    
    const username = faker.person.firstName() + Math.floor(Math.random() * 9000 + 1000);
    await page.locator('input[placeholder="Username *"]').fill(username);
    await page.getByRole("button", { name: "Complete Setup" }).click();
    
    return username;
  };

  test("start a new match button navigates to queue", async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await setupUserBeforeEach(page1);

      await setupUserBeforeEach(page2);
      console.log("users are set up");
      // Start matching - User 2 first, then User 1
      const user2StartLink = page2.getByRole("link", { name: "Start Matching" });
      await user2StartLink.click();
      await page2.waitForTimeout(5000);

      const user1StartLink = page1.getByRole("link", { name: "Start Matching" });
      await user1StartLink.click();
      await page1.waitForTimeout(5000);
      console.log(`user 1 url ${page1.url()}`);
      console.log(`user 2 url ${page2.url()}`);
      // Extract and verify session IDs match
      const user1SessionId = new URL(page1.url()).searchParams.get("session");
      const user2SessionId = new URL(page2.url()).searchParams.get("session");

      expect(user1SessionId).toBe(user2SessionId);

      // Wait for chat to load
      await page1.waitForLoadState("networkidle");
      await page2.waitForLoadState("networkidle");

      // Click chat history toggle for User 1
      const user1MenuBtn = page1.locator('button[aria-label*="menu"], button[aria-label*="saved"]').first();
      await expect(user1MenuBtn).toBeVisible({ timeout: 5000 });
      await user1MenuBtn.click();
      await page1.waitForTimeout(500);

      console.log("Users are starting to click new match")
      // Click "Start a New Match" button
      const user1StartNewMatchBtn = page1.getByRole("button", { name: "Start a New Match" });
      await expect(user1StartNewMatchBtn).toBeVisible({ timeout: 5000 });
      await user1StartNewMatchBtn.click();

      // Verify User 1 navigated back to match page
      await page1.waitForTimeout(1000);
      console.log(`new user1 link: ${page1.url()}`)
      expect(page1.url()).toContain("/match");

      const user1CancelBtn =page1.locator('button[aria-label="Cancel matching"]');
      await user1CancelBtn.click();
      await page1.waitForURL("**/match", { timeout: 5000 });



      // Click chat history toggle for User 2
      const user2MenuBtn = page2.locator('button[aria-label*="menu"], button[aria-label*="saved"]').first();
      await expect(user2MenuBtn).toBeVisible({ timeout: 5000 });
      await user2MenuBtn.click();
      await page2.waitForTimeout(500);

      // Click "Start a New Match" button
      const user2StartNewMatchBtn = page2.getByRole("button", { name: "Start a New Match" });
      await expect(user2StartNewMatchBtn).toBeVisible({ timeout: 5000 });
      await user2StartNewMatchBtn.click();

      // Verify User 2 navigated back to match page
      await page1.waitForTimeout(1000);
      console.log(`new user2 link: ${page2.url()}`)
      expect(page2.url()).toContain("/match");
      const user2CancelBtn = page2.locator('button[aria-label="Cancel matching"]');
      await user2CancelBtn.click();
      await page2.waitForURL("**/match", { timeout: 5000 });


    } finally {
      await context1.close();
      await context2.close();
    }

    
  });
    test("system notifies other user", async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await setupUserBeforeEach(page1);

      await setupUserBeforeEach(page2);
      console.log("users are set up");
      // Start matching - User 2 first, then User 1
      const user2StartLink = page2.getByRole("link", { name: "Start Matching" });
      await user2StartLink.click();
      await page2.waitForTimeout(5000);
      await page2.waitForURL("**/match/queue", { timeout: 10000 });

      const user1StartLink = page1.getByRole("link", { name: "Start Matching" });
      await user1StartLink.click();
      await page1.waitForTimeout(5000);
      console.log(`user 1 url ${page1.url()}`);
      console.log(`user 2 url ${page2.url()}`);
      // Extract and verify session IDs match
      const user1SessionId = new URL(page1.url()).searchParams.get("session");
      const user2SessionId = new URL(page2.url()).searchParams.get("session");

      expect(user1SessionId).toBe(user2SessionId);

      // Wait for chat to load
      await page1.waitForLoadState("networkidle");
      await page2.waitForLoadState("networkidle");

      // Click chat history toggle for User 1
      const user1MenuBtn = page1.locator('button[aria-label*="menu"], button[aria-label*="saved"]').first();
      await user1MenuBtn.click();
      await page1.waitForTimeout(500);

      console.log("Users are starting to click new match")
      // Click "Start a New Match" button
      const user1StartNewMatchBtn = page1.getByRole("button", { name: "Start a New Match" });
      await expect(user1StartNewMatchBtn).toBeVisible({ timeout: 5000 });
      await user1StartNewMatchBtn.click();

      // Verify User 1 navigated back to match page
      await page1.waitForTimeout(1000);
      console.log(`new user1 link: ${page1.url()}`)
      expect(page1.url()).toContain("/match");
      const user1CancelBtn = page1.locator('button[aria-label="Cancel matching"]');
      await user1CancelBtn.click();
      await page1.waitForURL("**/match", { timeout: 5000 });

      // Check for the system message in the chat
      const systemMessage = page2.locator('p:has-text("Your partner has left the chat")');
      await page2.waitForTimeout(5000);
      console.log("System message count:", await systemMessage.count());
      console.log("System message text:", await systemMessage.allTextContents());

    } finally {
      await context1.close();
      await context2.close();
    }

    
  });

   test("user gets matched again after pressing new match", async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();


    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();


    try {
      await setupUserBeforeEach(page1);
      await setupUserBeforeEach(page2);
      await setupUserBeforeEach(page3);


      console.log("users are set up");
      // Start matching - User 2 first, then User 1
      const user2StartLink = page2.getByRole("link", { name: "Start Matching" });
      await user2StartLink.click();
      await page2.waitForTimeout(5000);

      const user1StartLink = page1.getByRole("link", { name: "Start Matching" });
      await user1StartLink.click();
      await page1.waitForTimeout(5000);
      console.log(`user 1 url ${page1.url()}`);
      console.log(`user 2 url ${page2.url()}`);
      // Extract and verify session IDs match
      const user1SessionId = new URL(page1.url()).searchParams.get("session");
      const user2SessionId = new URL(page2.url()).searchParams.get("session");

      expect(user1SessionId).toBe(user2SessionId);

      // Wait for chat to load
      await page1.waitForLoadState("networkidle");
      await page2.waitForLoadState("networkidle");

      // Click chat history toggle for User 1
      const user1MenuBtn = page1.locator('button[aria-label*="menu"], button[aria-label*="saved"]').first();
      await user1MenuBtn.click();
      await page1.waitForTimeout(500);

      console.log("Users are starting to click new match")
      // Click "Start a New Match" button
      const user1StartNewMatchBtn = page1.getByRole("button", { name: "Start a New Match" });
      await expect(user1StartNewMatchBtn).toBeVisible({ timeout: 5000 });
      await user1StartNewMatchBtn.click();

      // Verify User 1 navigated back to match page
      await page1.waitForTimeout(1000);
      console.log(`new user1 link: ${page1.url()}`)
      expect(page1.url()).toContain("/match");

      //User 3 goes into queue and user 1 and 3 should match up
      const user3StartLink = page3.getByRole("link", { name: "Start Matching" });
      await user3StartLink.click();
      await page3.waitForTimeout(5000);

      const user1SessionIdV2 = new URL(page1.url()).searchParams.get("session");
      const user3SessionId = new URL(page3.url()).searchParams.get("session");

      expect(user1SessionIdV2).toBe(user3SessionId);


    } finally {
      await context1.close();
      await context2.close();
    }

    
  });
});