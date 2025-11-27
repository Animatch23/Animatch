import { test, expect, chromium } from "@playwright/test";
import { faker } from "@faker-js/faker";
import { mockSession, login } from "../helpers/login.js";

const completeInterestSetup = async (page, coursePreference, housingPreference, organizationPreferences) => {
  const courseButtons = page.locator(
    'label:has-text("Your Course / Major") + div button'
  );

  const courseCount = await courseButtons.count();
  let selectedCourse;
  let courseButton;

  // If coursePreference is provided, find that specific course
  if (coursePreference) {
    for (let i = 0; i < courseCount; i++) {
      const btn = courseButtons.nth(i);
      const text = await btn.innerText();

      if (text === coursePreference) {
        selectedCourse = text;
        courseButton = btn;
        break;
      }
    }
    if (!courseButton) {
      throw new Error(`Course "${coursePreference}" not found`);
    }
  } else {
    // Random selection if no preference
    for (let i = 0; i < courseCount; i++) {
      const index = Math.floor(Math.random() * courseCount);
      const btn = courseButtons.nth(index);
      const text = await btn.innerText();

      if (text !== "Other") {
        selectedCourse = text;
        courseButton = btn;
        break;
      }
    }
  }

  await courseButton.click();

  const housingButtons = page.locator(
    'label:has-text("Your Housing") + div button'
  );

  const housingCount = await housingButtons.count();
  let housingButton;
  let selectedHousing;

  // If housingPreference is provided, find that specific housing
  if (housingPreference) {
    for (let i = 0; i < housingCount; i++) {
      const btn = housingButtons.nth(i);
      const text = await btn.innerText();

      if (text === housingPreference) {
        selectedHousing = text;
        housingButton = btn;
        break;
      }
    }
    if (!housingButton) {
      throw new Error(`Housing "${housingPreference}" not found`);
    }
  } else {
    // Random selection if no preference
    const randomHousingIndex = Math.floor(Math.random() * housingCount);
    housingButton = housingButtons.nth(randomHousingIndex);
    selectedHousing = await housingButton.innerText();
  }

  await housingButton.click();

  const orgButtons = page.locator(
    'p:has-text("Popular organizations:") + div button'
  );

  const orgCount = await orgButtons.count();
  let selectedOrganizations = [];
  const clickedIndices = new Set();

  // If organizationPreferences are provided, select those specific ones
  if (organizationPreferences && organizationPreferences.length > 0) {
    for (const orgPreference of organizationPreferences) {
      let found = false;
      for (let i = 0; i < orgCount; i++) {
        if (!clickedIndices.has(i)) {
          const btn = orgButtons.nth(i);
          const text = await btn.innerText();

          if (text === orgPreference) {
            await btn.click();
            clickedIndices.add(i);
            selectedOrganizations.push(text);
            await page.waitForTimeout(200);
            found = true;
            break;
          }
        }
      }
      if (!found) {
        console.log(`Organization "${orgPreference}" not found`);
      }
    }
  } else {
    // Random selection if no preferences
    const howMany = Math.floor(Math.random() * 3) + 2;

    while (clickedIndices.size < howMany) {
      const index = Math.floor(Math.random() * orgCount);
      if (!clickedIndices.has(index)) {
        clickedIndices.add(index);

        const btn = orgButtons.nth(index);
        const text = await btn.innerText();
        selectedOrganizations.push(text);

        await btn.click();
        await page.waitForTimeout(200);
      }
    }
  }

  const completeBtn = page.getByRole("button", { name: "Complete Setup" });

  await expect(completeBtn).toBeEnabled({ timeout: 10000 });
  await completeBtn.click();

  await page.waitForURL("**/match", { timeout: 15000 });

  return { selectedCourse, selectedHousing, selectedOrganizations };
};

async function setupUser(page) {
  await mockSession(page);
  await login(page);

  await page.goto("http://localhost:3000/terms");
  await page.getByText("Accept & Continue").click();

  const username = faker.person.firstName() + Math.floor(Math.random() * 9000 + 1000);
  await page.locator('input[placeholder="Username *"]').fill(username);

  await page.getByRole("button", { name: "Continue" }).click();
  await completeInterestSetup(page, "Engineering", "Dorm A", ["Gaming Society"]);

  await page.getByText("Start Matching").click();

  return username
}

test.describe("save chat test", () => {
  test.describe.configure({
    repeatEach: 1,
    retries: 1,
  });

  test("save chat", async () => {
    const browser = await chromium.launch();

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();
    const context4 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();
    const page4 = await context4.newPage();

    const saveChatSelector = 'button:has-text("Save Chat")';
    const successSelector = 'div.rounded-md:has-text("Match saved! Both of you have saved this chat.")';

    let username1, username2;
    const flow1 = async () => {
      username1 = await setupUser(page1);
      await page1.click(saveChatSelector)
      // await expect(page1.locator(successSelector)).toBeVisible();
      await page1.goto("http://localhost:3000/match");
    };

    const flow2 = async () => {
      username2 = await setupUser(page2);
      await page2.click(saveChatSelector);
      // await expect(page2.locator(successSelector)).toBeVisible();
      await page2.goto("http://localhost:3000/match");
    };

    await Promise.all([flow1(), flow2()]);

    await setupUser(page3);
    await setupUser(page4);

    await Promise.all([
      page1.getByText("Start Matching").click(),
      page2.getByText("Start Matching").click(),
    ]);

    await expect(
      page1.locator("h1.text-lg.font-semibold.text-gray-900")
    ).toHaveText(username2);

    await expect(
      page2.locator("h1.text-lg.font-semibold.text-gray-900")
    ).toHaveText(username1);

    await Promise.all([context1.close(), context2.close(), context3.close(), context4.close()]);

    await browser.close();
  });
});
