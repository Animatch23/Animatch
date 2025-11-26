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
    const browser1 = await chromium.launch({ headless: false });
    const context1 = await browser1.newContext();
    const page1 = await context1.newPage();

    const browser2 = await chromium.launch({ headless: false });
    const context2 = await browser2.newContext();
    const page2 = await context2.newPage();

    const saveChatSelector = 'button:has-text("Save Chat")';
    const successSelector = 'div.rounded-md:has-text("Chat saved to your account.")';

    let username1, username2;
    const flow1 = async () => {
      username1 = await setupUser(page1);
      await page1.click(saveChatSelector)
      await expect(page1.locator(successSelector)).toBeVisible();
      await page1.goto("http://localhost:3000/match");
    };

    const flow2 = async () => {
      username2 = await setupUser(page2);
      await page2.click(saveChatSelector);
      await expect(page2.locator(successSelector)).toBeVisible();
      await page2.goto("http://localhost:3000/match");
    };

    await Promise.all([flow1(), flow2()]);

    const browser3 = await chromium.launch({ headless: false });
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

    const browser4 = await chromium.launch({ headless: false });
    const context4 = await browser4.newContext();
    const page4 = await context4.newPage();
    await setupUser(page4)

    await browser1.close();
    await browser2.close();
    await browser3.close();
    await browser4.close();
  });
});
