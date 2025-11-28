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

  let retries = 3;
  while (retries > 0) {
    try {
      await page.goto("http://localhost:3000/terms", { timeout: 10000 });
      break;
    } catch (error) {
      retries--;
      if (retries === 0) throw error;
      await page.waitForTimeout(2000);
    }
  }

  await page.getByText("Accept & Continue").click();

  const username = faker.person.firstName() + Math.floor(Math.random() * 9000 + 1000);
  await page.locator('input[placeholder="Username *"]').fill(username);

  await page.getByRole("button", { name: "Continue" }).click();
  await completeInterestSetup(page, "Engineering", "Dorm A", ["Gaming Society"]);

  return username
}

test.describe("save chat test", () => {

  test.describe.configure({
    repeatEach: 1
  });
  test("save chat, clicked button", async () => {
    const browser = await chromium.launch();

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const saveChatSelector = 'button:has-text("Save Chat")';
    const successSelector = 'div.rounded-md:has-text("Chat saved to your account.")';

    let username1, username2;

    [username1, username2] = await Promise.all([
      setupUser(page1),
      setupUser(page2)
    ]);

    await Promise.all([
      page1.getByText("Start Matching").click(),
      page2.getByText("Start Matching").click()
    ]);

    await Promise.all([
      page1.waitForURL('**/match/chat?session=*', { timeout: 45000 }),
      page2.waitForURL('**/match/chat?session=*', { timeout: 45000 })
    ]);

    await Promise.all([
      page1.waitForTimeout(5000),
      page2.waitForTimeout(5000)
    ]);

    await page1.click(saveChatSelector, { timeout: 30000 })
    await page2.click(saveChatSelector, { timeout: 30000 })

    console.log("User1 Clicked Save Chat");
    console.log("User2 Clicked Save Chat");
    const successMessageSelector = 'span:has-text("🎉 Match saved! Both of you have saved this chat.")';
    await expect(page1.locator(successMessageSelector)).toBeVisible({ timeout: 30000 });
    await expect(page2.locator(successMessageSelector)).toBeVisible({ timeout: 30000 });

    await Promise.all([
      page1.goto("http://localhost:3000/match"),
      page2.goto("http://localhost:3000/match")
    ]);


    const savedChatButton1 = page1.locator('ul li button span.font-semibold');
    await savedChatButton1.waitFor({ state: 'visible', timeout: 30000 });
    const savedChatButton2 = page2.locator('ul li button span.font-semibold');
    await savedChatButton2.waitFor({ state: 'visible', timeout: 30000 });

    const savedChatName1 = await page1.locator(
      'ul li button span.font-semibold'
    ).innerText();
    console.log(`User1 Saved chat displayed: ${savedChatName1} (Expected: match with ${username2})`);

    const savedChatName2 = await page2.locator(
      'ul li button span.font-semibold'
    ).innerText();
    console.log(`User2 Saved chat displayed: ${savedChatName2} (Expected: match with ${username1})`);

    await page1.locator('ul li button').first().click();
    console.log(`User1 Opened saved chat with ${username2}`);

    await page2.locator('ul li button').first().click();
    console.log(`User2 Opened saved chat with ${username1}`);

    await expect(
      page1.locator("h1.text-lg.font-semibold.text-gray-900")
    ).toHaveText(username2, { timeout: 30000 });
    console.log(`User1 Verified chat header shows: ${username2}`);

    await expect(
      page2.locator("h1.text-lg.font-semibold.text-gray-900")
    ).toHaveText(username1, { timeout: 30000 });
    console.log(`User2 Verified chat header shows: ${username1}`);

    await Promise.all([context1.close(), context2.close()]);

    await browser.close();
  });

  test("save chat, queue with another user", async () => {
    const browser = await chromium.launch();

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const saveChatSelector = 'button:has-text("Save Chat")';
    // Look for either success message (waiting for partner OR both saved)
    const successSelector = 'div.p-2.text-sm.rounded span';


    let username1, username2;

    [username1, username2] = await Promise.all([
      setupUser(page1),
      setupUser(page2)
    ]);

    await Promise.all([
      page1.getByText("Start Matching").click(),
      page2.getByText("Start Matching").click()
    ]);

    await Promise.all([
      page1.waitForURL('**/match/chat?session=*', { timeout: 45000 }),
      page2.waitForURL('**/match/chat?session=*', { timeout: 45000 })
    ]);

    await Promise.all([
      page1.waitForTimeout(5000),
      page2.waitForTimeout(5000)
    ]);

    await page1.click(saveChatSelector, { timeout: 30000 })
    await page2.click(saveChatSelector, { timeout: 30000 })

    console.log("User1 Clicked Save Chat");
    console.log("User2 Clicked Save Chat");

    const successMessageSelector = 'span:has-text("🎉 Match saved! Both of you have saved this chat.")';
    await expect(page1.locator(successMessageSelector)).toBeVisible({ timeout: 30000 });
    await expect(page2.locator(successMessageSelector)).toBeVisible({ timeout: 30000 });

    await Promise.all([
      page1.locator('button[aria-label="Back to matchmaking"]').click(),
      page2.locator('button[aria-label="Back to matchmaking"]').click()
    ]);

    console.log(`User1: ${username1}`)
    console.log(`User2: ${username2}`)

    const savedChatButton1 = page1.locator('ul li button span.font-semibold');
    await savedChatButton1.waitFor({ state: 'visible', timeout: 30000 });
    const savedChatButton2 = page2.locator('ul li button span.font-semibold');
    await savedChatButton2.waitFor({ state: 'visible', timeout: 30000 });

    const context3 = await browser.newContext();
    const page3 = await context3.newPage();

    const savedChatName = await page1.locator(
      'ul li button span.font-semibold'
    ).innerText();

    console.log("Match found: ", savedChatName);

    let username3 = await setupUser(page3);

    await Promise.all([
      page1.waitForTimeout(2500),
      page3.waitForTimeout(2500)
    ]);

    await Promise.all([
      page1.getByText("Start Matching").click(),
      page3.getByText("Start Matching").click()
    ]);

    try {
      await Promise.all([
        page1.waitForURL('**/match/chat?session=*', { timeout: 45000 }),
        page3.waitForURL('**/match/chat?session=*', { timeout: 45000 })
      ]);

      await Promise.all([
        page1.waitForTimeout(5000),
        page3.waitForTimeout(5000)
      ]);

      const matchedUser1 = await page1.locator("h1.text-lg.font-semibold.text-gray-900").innerText();
      console.log("User 1 matched with:", matchedUser1);
      console.log("Expected match:", username3);

      await expect(
        page1.locator("h1.text-lg.font-semibold.text-gray-900")
      ).toHaveText(username3, { timeout: 15000 });

      const matchedUser3 = await page3.locator("h1.text-lg.font-semibold.text-gray-900").innerText();
      console.log("User 3 matched with:", matchedUser3);
      console.log("Expected match:", username1);

      await expect(
        page3.locator("h1.text-lg.font-semibold.text-gray-900")
      ).toHaveText(username1, { timeout: 15000 });

    } catch (err) {
      const cancelButton = page3.locator('button[aria-label="Cancel matching"]');
      await cancelButton.click();
    }

    await Promise.all([context1.close(), context2.close(), context3.close()]);

    await browser.close();
  });
});

