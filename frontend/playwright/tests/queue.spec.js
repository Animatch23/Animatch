import { test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker";
import { mockSession, login } from "../helpers/login.js";

test.describe("queue tests", () => {
  test.describe.configure({
    repeatEach: 2,
    retries: 1,
  });

  test("queue test", async ({ page }) => {
    await mockSession(page);
    await login(page);

    await page.goto("http://localhost:3000/terms");
    await page.getByText("Accept & Continue").click();

    const username = faker.person.firstName() + Math.floor(Math.random() * 9000 + 1000);
    await page.locator('input[placeholder="Username *"]').fill(username);

    await page.getByText("Complete Setup").click();
    await page.getByText("Start Matching").click();

    const element = await page.waitForSelector("h1:text('AniMatch Chat')", {
      timeout: 10000,
    });

    expect(element).not.toBeNull();
  });
});
