import { test, expect, chromium } from "@playwright/test";
import { faker } from "@faker-js/faker";
import { mockSession, login } from "../helpers/login.js";

async function setupUser(page) {
  await mockSession(page);
  await login(page);

  await page.goto("http://localhost:3000/terms");
  await page.getByText("Accept & Continue").click();

  const username = faker.person.firstName() + Math.floor(Math.random() * 9000 + 1000);
  await page.locator('input[placeholder="Username *"]').fill(username);

  await page.getByText("Complete Setup").click();
  await page.getByText("Start Matching").click();

  return username
}

test.describe("save chat test", () => {
  test.describe.configure({
    repeatEach: 1,
    retries: 1,
  });

  test("save chat", async () => {
    test.setTimeout(60000); // Increase timeout to 60 seconds
    
    const browser1 = await chromium.launch();
    const context1 = await browser1.newContext();
    const page1 = await context1.newPage();

    const browser2 = await chromium.launch();
    const context2 = await browser2.newContext();
    const page2 = await context2.newPage();

    const saveChatSelector = 'button:has-text("Save Chat")';
    // Look for either success message (waiting for partner OR both saved)
    const successSelector = 'div.p-2.text-sm.rounded span';

    let username1, username2;
    const flow1 = async () => {
      username1 = await setupUser(page1);
      
      // Wait for redirect to chat page after match is found
      await page1.waitForURL('**/match/chat?session=*', { timeout: 30000 });
      
      // Wait for chat interface and Save Chat button to be ready
      await page1.waitForSelector('button:has-text("Save Chat")', { timeout: 10000 });
      await page1.waitForTimeout(1000); // Wait for socket connection
      
      await page1.click(saveChatSelector, { timeout: 10000 });
      
      // Check that feedback message appears (either waiting or success)
      const feedbackSpan = page1.locator(successSelector);
      await expect(feedbackSpan).toBeVisible({ timeout: 10000 });
      const feedbackText = await feedbackSpan.textContent();
      
      // Verify it's a save-related message
      if (!feedbackText.includes("saved") && !feedbackText.includes("Waiting")) {
        throw new Error(`Unexpected feedback: ${feedbackText}`);
      }
      
      await page1.goto("http://localhost:3000/match");
    };

    const flow2 = async () => {
      username2 = await setupUser(page2);
      
      // Wait for redirect to chat page after match is found
      await page2.waitForURL('**/match/chat?session=*', { timeout: 30000 });
      
      // Wait for chat interface and Save Chat button to be ready
      await page2.waitForSelector('button:has-text("Save Chat")', { timeout: 10000 });
      await page2.waitForTimeout(1000); // Wait for socket connection
      
      await page2.click(saveChatSelector, { timeout: 10000 });
      
      // Check that feedback message appears (either waiting or success)
      const feedbackSpan = page2.locator(successSelector);
      await expect(feedbackSpan).toBeVisible({ timeout: 10000 });
      const feedbackText = await feedbackSpan.textContent();
      
      // Verify it's a save-related message
      if (!feedbackText.includes("saved") && !feedbackText.includes("Waiting")) {
        throw new Error(`Unexpected feedback: ${feedbackText}`);
      }
      
      await page2.goto("http://localhost:3000/match");
    };

    await Promise.all([flow1(), flow2()]);

    const browser3 = await chromium.launch();
    const context3 = await browser3.newContext();
    const page3 = await context3.newPage();
    await setupUser(page3)

    await Promise.all([
      await page1.getByText("Start Matching").click(),
      await page2.getByText("Start Matching").click(),
    ]);

    await expect(
      page1.locator("h1.text-lg.font-semibold.text-gray-900")
    ).toHaveText(username2);

    await expect(
      page2.locator("h1.text-lg.font-semibold.text-gray-900")
    ).toHaveText(username1);

    const browser4 = await chromium.launch();
    const context4 = await browser4.newContext();
    const page4 = await context4.newPage();
    await setupUser(page4)

    await browser1.close();
    await browser2.close();
    await browser3.close();
    await browser4.close();
  });
});
