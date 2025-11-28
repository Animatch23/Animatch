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
test("User A blocks User B, and blocked users cannot match again", async () => {
  const browser = await chromium.launch();

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await fetch("http://localhost:3000/test/clearQueue");
  await fetch("http://localhost:3000/test/resetActiveUsers");

  await Promise.all([
    setupUser(pageA, "Law", "Commuter", ["Music Club"]),
    setupUser(pageB, "Law", "Commuter", ["Anime Club"]),
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

    // Chat exchange
    await pageA.locator("textarea").fill("hi");
    await pageA.getByRole("button", { name: "Send" }).click();
    await expect(pageB.getByText("hi")).toBeVisible({ timeout: 5000 });

    await pageB.locator("textarea").fill("hi");
    await pageB.getByRole("button", { name: "Send" }).click();
    await expect(pageA.getByText("hi")).toBeVisible({ timeout: 5000 });

    // First Block on page
    await pageA.getByRole("button", { name: "Block" }).first().click();

    await pageA.getByText("Block user?").waitFor({ timeout: 10000 });

    const modal = pageA.getByText("Block user?").locator("..").locator("..");

    // Click the Block button inside the modal
    await modal.getByRole("button", { name: "Block" }).click();

    await expect(pageA.getByText("Block user?")).toHaveCount(0, { timeout: 10000 });

    await pageA.waitForURL("**/match", { timeout: 30000 });

    await expect(pageB.getByText("⚠️ Partner has left the chat")).toBeVisible({ timeout: 20000 });

    await pageA.waitForTimeout(500);

    await pageB.getByRole("button", { name: "Back" }).click();
    await pageB.waitForURL("**/match", { timeout: 20000 });

    // Both try to match again
    await Promise.all([
      pageA.getByText("Start Matching").click(),
      pageB.getByText("Start Matching").click()
    ]);

    await pageA.waitForTimeout(2500);

    // They must NOT match again
    await expect(pageA.locator("div.chat-window")).not.toBeVisible({ timeout: 5000 });
    await expect(pageB.locator("div.chat-window")).not.toBeVisible({ timeout: 5000 });

  } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
  }
});

// Test Case #2
test("Block canceled flow: Users can continue chat if block is canceled", async () => {
const browser = await chromium.launch();

const contextA = await browser.newContext();
const contextB = await browser.newContext();

const pageA = await contextA.newPage();
const pageB = await contextB.newPage();

// Use page.evaluate to fetch since Node fetch may not be available
await fetch("http://localhost:3000/test/clearQueue");
await fetch("http://localhost:3000/test/resetActiveUsers");

await Promise.all([
setupUser(pageA, "Law", "Commuter", ["Music Club"]),
setupUser(pageB, "Law", "Commuter", ["Anime Club"]),
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

    // Chat exchange
    await pageA.locator("textarea").fill("hi");
    await pageA.getByRole("button", { name: "Send" }).click();
    await expect(pageB.getByText("hi")).toBeVisible({ timeout: 5000 });

    await pageB.locator("textarea").fill("hello again");
    await pageB.getByRole("button", { name: "Send" }).click();
    await expect(pageA.getByText("hello again")).toBeVisible({ timeout: 5000 });

    // Open block modal but cancel
    await pageA.getByRole("button", { name: "Block" }).first().click();
    await pageA.getByText("Block user?").waitFor({ timeout: 10000 });

    const modal = pageA.getByText("Block user?").locator("..").locator("..");

    // Click Cancel inside the modal
    await modal.getByRole("button", { name: "Cancel" }).click();

    await expect(pageA.getByText("Block user?")).toHaveCount(0, { timeout: 5000 });

    // Chat should still be active
    await pageA.locator("textarea").fill("still here");
    await pageA.getByRole("button", { name: "Send" }).click();
    await expect(pageB.getByText("still here")).toBeVisible({ timeout: 5000 });

    } finally {
    await contextA.close();
    await contextB.close();
    await browser.close();
    }
});