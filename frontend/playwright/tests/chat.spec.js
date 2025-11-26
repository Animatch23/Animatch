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
    test.setTimeout(120000); // Increase timeout to 120 seconds
    
    const browser1 = await chromium.launch();
    const context1 = await browser1.newContext();
    const page1 = await context1.newPage();

    const browser2 = await chromium.launch();
    const context2 = await browser2.newContext();
    const page2 = await context2.newPage();

    // Setup both users first (profile completion) - do NOT click Start Matching yet
    await Promise.all([
      setupUser(page1),
      setupUser(page2)
    ]);

    // Now click Start Matching for BOTH users simultaneously
    await Promise.all([
      page1.getByText("Start Matching").click(),
      page2.getByText("Start Matching").click()
    ]);

    // Wait for both to be redirected to chat (they should match with each other)
    await Promise.all([
      page1.waitForURL('**/match/chat?session=*', { timeout: 45000 }),
      page2.waitForURL('**/match/chat?session=*', { timeout: 45000 })
    ]);

    // Wait for chat interface to load and socket to connect for both users
    await Promise.all([
      page1.waitForSelector('input[placeholder="Type your message..."], textarea[placeholder="Type your message..."]', { timeout: 20000 }),
      page2.waitForSelector('input[placeholder="Type your message..."], textarea[placeholder="Type your message..."]', { timeout: 20000 })
    ]);

    // Additional wait for socket connections to stabilize
    await Promise.all([
      page1.waitForTimeout(2000),
      page2.waitForTimeout(2000)
    ]);

    // Now test messaging
    await page1.getByPlaceholder("Type your message...").fill("Hello");
    await page1.getByRole("button", { name: "Send" }).click();

    await expect(
      page1.locator("div.bg-green-600").filter({ hasText: "Hello" })
    ).toBeVisible({ timeout: 10000 });

    await page2.getByPlaceholder("Type your message...").fill("Hello");
    await page2.getByRole("button", { name: "Send" }).click();

    await expect(
      page2.locator("div.bg-green-600").filter({ hasText: "Hello" })
    ).toBeVisible({ timeout: 10000 });

    await browser1.close();
    await browser2.close();
  });
});
