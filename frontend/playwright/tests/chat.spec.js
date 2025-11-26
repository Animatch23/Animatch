import { test, expect, chromium } from "@playwright/test";
import { faker } from "@faker-js/faker";
import { mockSession, login as loginHelper } from "../helpers/login.js";

async function setupUser(page) {
  await mockSession(page);
  await loginHelper(page);

  await page.goto("http://localhost:3000/terms");
  await page.getByText("Accept & Continue").click();

  const username = faker.person.firstName() + Math.floor(Math.random() * 9000 + 1000);
  await page.locator('input[placeholder="Username *"]').fill(username);

  await page.getByText("Complete Setup").click();
}

test.describe("chat test", () => {
  test.describe.configure({
    repeatEach: 1,
    retries: 1,
  });

  test("chat", async () => {
    test.setTimeout(60000); // Increase timeout to 60 seconds
    
    const browser1 = await chromium.launch();
    const context1 = await browser1.newContext();
    const page1 = await context1.newPage();

    const browser2 = await chromium.launch();
    const context2 = await browser2.newContext();
    const page2 = await context2.newPage();

    const flow1 = async () => {
      await setupUser(page1);
      await page1.getByText("Start Matching").click();
      
      // Wait for redirect to chat page after match is found
      await page1.waitForURL('**/match/chat?session=*', { timeout: 30000 });
      
      // Wait for chat interface to load
      await page1.waitForSelector('input[placeholder="Say hello..."]', { timeout: 10000 });
      await page1.waitForTimeout(1000); // Additional wait for socket connection

      await page1.getByPlaceholder("Say hello...").fill("Hello");
      await page1.getByRole("button", { name: "Send" }).click();

      await expect(
        page1.locator("div.bg-white").filter({ hasText: "Hello" })
      ).toBeVisible({ timeout: 10000 });
    };

    const flow2 = async () => {
      await setupUser(page2);
      await page2.getByText("Start Matching").click();
      
      // Wait for redirect to chat page after match is found
      await page2.waitForURL('**/match/chat?session=*', { timeout: 30000 });
      
      // Wait for chat interface to load
      await page2.waitForSelector('input[placeholder="Say hello..."]', { timeout: 10000 });
      await page2.waitForTimeout(1000); // Additional wait for socket connection

      await page2.getByPlaceholder("Say hello...").fill("Hello");
      await page2.getByRole("button", { name: "Send" }).click();

      await expect(
        page2.locator("div.bg-white").filter({ hasText: "Hello" })
      ).toBeVisible({ timeout: 10000 });
    };

    await Promise.all([flow1(), flow2()]);

    await browser1.close();
    await browser2.close();
  });
});
