import { test, expect, chromium } from "@playwright/test";
import { faker } from "@faker-js/faker";
import { mockSession, login } from "../helpers/login.js";

// Helper to open saved chats if collapsed
async function openSavedChats(page) {
  const toggleArrow = page.getByRole("button", { name: /Collapse saved chats|Expand saved chats/ });
  await toggleArrow.waitFor({ state: "visible", timeout: 10000 });

  const name = await toggleArrow.getAttribute("name"); 
  if (name?.includes("Expand")) {
    await toggleArrow.click(); 
    await page.waitForTimeout(500); 
  }
}

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
test.describe("save chat test", () => {

  test("save chat, clicked button", async () => {
    const browser = await chromium.launch({ headless: false }); 

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const saveChatSelector = 'button:has-text("Save Chat")';

    const [usernameA, usernameB] = await Promise.all([
      setupUser(page1, "Law", "Commuter", ["Music Club"]),
      setupUser(page2, "Law", "Commuter", ["Anime Club"]),
    ]);

    await Promise.all([
      page1.getByText("Start Matching").click(),
      page2.getByText("Start Matching").click()
    ]);

    await Promise.all([
      page1.waitForURL('**/match/chat?session=*', { timeout: 45000 }),
      page2.waitForURL('**/match/chat?session=*', { timeout: 45000 })
    ]);

    await page1.waitForTimeout(3000);
    await page2.waitForTimeout(3000);

    await page1.click(saveChatSelector);
    await page2.click(saveChatSelector);

    const successMessageSelector = 'span:has-text("🎉 Match saved! Both of you have saved this chat.")';
    await expect(page1.locator(successMessageSelector)).toBeVisible();
    await expect(page2.locator(successMessageSelector)).toBeVisible();

    await Promise.all([
      page1.goto("http://localhost:3000/match"),
      page2.goto("http://localhost:3000/match")
    ]);

    // OPEN HAMBURGER MENU
    await openSavedChats(page1);
    await openSavedChats(page2);

    // Now the saved chat buttons are visible
    const savedChatButton1 = page1.locator('li button span.font-semibold');
    await savedChatButton1.waitFor({ state: 'visible', timeout: 10000 });

    const savedChatButton2 = page2.locator('li button span.font-semibold');
    await savedChatButton2.waitFor({ state: 'visible', timeout: 10000 });

    const savedChatName1 = await savedChatButton1.innerText();
    console.log(`User1 sees saved chat: ${savedChatName1}`);

    const savedChatName2 = await savedChatButton2.innerText();
    console.log(`User2 sees saved chat: ${savedChatName2}`);

    // Open the saved chats
    await savedChatButton1.click();
    await savedChatButton2.click();

    // Verify chat header
    await expect(page1.locator("h1.text-lg.font-semibold.text-gray-900")).toHaveText(usernameB, { timeout: 10000 });
    await expect(page2.locator("h1.text-lg.font-semibold.text-gray-900")).toHaveText(usernameA, { timeout: 10000 });

    await Promise.all([context1.close(), context2.close()]);
    await browser.close();
  });

});
