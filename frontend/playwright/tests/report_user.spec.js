import { test, expect, chromium } from "@playwright/test";
import { faker } from "@faker-js/faker";
import { mockSession, login } from "../helpers/login.js";

const setupUser = async (page, course, housing, orgs) => {
  await mockSession(page);
  await login(page);

  await page.goto("http://localhost:3000/terms");
  await page.getByText("Accept & Continue").click();

  const username = faker.person.firstName() + Math.floor(Math.random() * 9000 + 1000);
  await page.locator('input[placeholder="Username *"]').fill(username);
  await page.getByRole("button", { name: "Continue" }).click();

  await completeInterestSetup(page, course, housing, orgs);
  return username;
};

const completeInterestSetup = async (page, coursePreference, housingPreference, organizationPreferences) => {
  const courseButtons = page.locator('label:has-text("Your Course / Major") + div button');
  const courseCount = await courseButtons.count();
  let selectedCourse, courseButton;

  if (coursePreference) {
    for (let i = 0; i < courseCount; i++) {
      const btn = courseButtons.nth(i);
      if ((await btn.innerText()) === coursePreference) {
        selectedCourse = coursePreference;
        courseButton = btn;
        break;
      }
    }
  }
  if (!courseButton) {
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

  const housingButtons = page.locator('label:has-text("Your Housing") + div button');
  const housingCount = await housingButtons.count();
  let housingButton, selectedHousing;

  if (housingPreference) {
    for (let i = 0; i < housingCount; i++) {
      const btn = housingButtons.nth(i);
      if ((await btn.innerText()) === housingPreference) {
        selectedHousing = housingPreference;
        housingButton = btn;
        break;
      }
    }
  }
  if (!housingButton) {
    const index = Math.floor(Math.random() * housingCount);
    housingButton = housingButtons.nth(index);
    selectedHousing = await housingButton.innerText();
  }
  await housingButton.click();

  const orgButtons = page.locator('p:has-text("Popular organizations:") + div button');
  const orgCount = await orgButtons.count();
  let selectedOrganizations = [];
  const clicked = new Set();

  if (organizationPreferences?.length) {
    for (const org of organizationPreferences) {
      for (let i = 0; i < orgCount; i++) {
        if (!clicked.has(i) && (await orgButtons.nth(i).innerText()) === org) {
          await orgButtons.nth(i).click();
          clicked.add(i);
          selectedOrganizations.push(org);
          await page.waitForTimeout(200);
          break;
        }
      }
    }
  } else {
    const qty = Math.min(3, orgCount);
    while (clicked.size < qty) {
      const index = Math.floor(Math.random() * orgCount);
      if (!clicked.has(index)) {
        await orgButtons.nth(index).click();
        selectedOrganizations.push(await orgButtons.nth(index).innerText());
        clicked.add(index);
        await page.waitForTimeout(200);
      }
    }
  }

  const completeBtn = page.getByRole("button", { name: "Complete Setup" });
  await expect(completeBtn).toBeEnabled({ timeout: 20000 });
  await completeBtn.click();
  await page.waitForURL("**/match", { timeout: 30000 });

  return { selectedCourse, selectedHousing, selectedOrganizations };
};

// Test Case #1
test("User A reports User B without description, User B unaware", async () => {
  test.setTimeout(60000);
  const browser = await chromium.launch({ headless: true });
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // Reset backend
  await pageA.request.get("http://localhost:3000/test/clearQueue");
  await pageA.request.get("http://localhost:3000/test/resetActiveUsers");

  await Promise.all([
    setupUser(pageA, "Sciences", "Dorm A", ["Music Club"]),
    setupUser(pageB, "Sciences", "Dorm A", ["Anime Club"])
  ]);

  try {
    // Start matching
    await Promise.all([
      pageA.getByText("Start Matching").click(),
      pageB.getByText("Start Matching").click()
    ]);

    await Promise.all([
        pageA.waitForURL("**/match/chat?session=*", { timeout: 60000 }),
        pageB.waitForURL("**/match/chat?session=*", { timeout: 60000 })
    ]);

    // Open report modal
    await pageA.getByRole("button", { name: "Report User" }).click();

    const modal = pageA.locator('div.fixed.inset-0');
    await expect(modal).toBeVisible();

    // Select "Other"
    await modal.locator('select[aria-label="Report reason"]').selectOption("Other");

    // Submit
    await modal.getByRole("button", { name: "Submit Report" }).click();

    await expect(modal).toHaveCount(0, { timeout: 5000 });

    // Confirm success message for User A
    await expect(pageA.getByText("Report submitted successfully. Admins will review it shortly.")).toBeVisible({ timeout: 5000 });

    // Ensure User B is unaware
    await expect(pageB.getByText("Report submitted successfully. Admins will review it shortly.")).toHaveCount(0);
    await expect(pageB.locator('div[role="dialog"]')).toHaveCount(0);

    // Optional: User B can still chat
    await pageB.locator("textarea").fill("still chatting?");
    await pageB.getByRole("button", { name: "Send" }).click();
    await expect(pageA.getByText("still chatting?")).toBeVisible({ timeout: 5000 });

  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

// Test Case #2
test("User A reports User B with description, User B unaware", async () => {
  test.setTimeout(60000);
  const browser = await chromium.launch({ headless: true });
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // Reset backend
  await pageA.request.get("http://localhost:3000/test/clearQueue");
  await pageA.request.get("http://localhost:3000/test/resetActiveUsers");

  await Promise.all([
    setupUser(pageA, "Sciences", "Dorm A", ["Music Club"]),
    setupUser(pageB, "Sciences", "Dorm A", ["Anime Club"])
  ]);

  try {
    // Start matching
    await Promise.all([
      pageA.getByText("Start Matching").click(),
      pageB.getByText("Start Matching").click()
    ]);

    await Promise.all([
      pageA.waitForURL("**/match/chat?session=*", { timeout: 60000 }),
      pageB.waitForURL("**/match/chat?session=*", { timeout: 60000 })
    ]);

    // Open report modal
    await pageA.getByRole("button", { name: "Report User" }).click();

    const modal = pageA.locator('div.fixed.inset-0');
    await expect(modal).toBeVisible();

    // Select "Spam"
    await modal.locator('select[aria-label="Report reason"]').selectOption("Spam");

    // Fill description field
    await modal.locator('textarea[aria-label="Report description (optional)"]').fill(
      "Automated test report description"
    );

    // Submit
    await modal.getByRole("button", { name: "Submit Report" }).click();

    await expect(modal).toHaveCount(0, { timeout: 5000 });

    // Confirm success message for User A
    await expect(
      pageA.getByText("Report submitted successfully. Admins will review it shortly.")
    ).toBeVisible({ timeout: 5000 });

    // User B is unaware
    await expect(
      pageB.getByText("Report submitted successfully. Admins will review it shortly.")
    ).toHaveCount(0);

    await expect(pageB.locator('div[role="dialog"]')).toHaveCount(0);

    // User B can still chat
    await pageB.locator("textarea").fill("still chatting?");
    await pageB.getByRole("button", { name: "Send" }).click();
    await expect(pageA.getByText("still chatting?")).toBeVisible({ timeout: 5000 });

  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});
