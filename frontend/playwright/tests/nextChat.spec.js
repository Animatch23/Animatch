import { test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker";
import { mockSession, login, completeInterestSetupRandom } from "../helpers/login.js";

test.describe("next chat button tests", () => {
  test.describe.configure({
    repeatEach: 1,
    retries: 0,
  });

  const setupUserBeforeEach = async (page) => {
    console.log(`Setting up ${page}`)
    await mockSession(page);
    await login(page);

    await page.goto("http://localhost:3000/terms");
    await page.getByText("Accept & Continue").click();
    
    const username = faker.person.firstName() + Math.floor(Math.random() * 9000 + 1000);
    await page.locator('input[placeholder="Username *"]').fill(username);
    await page.getByRole("button", { name: "Continue" }).click();
    
    return username;
  };

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

  test("start a new match button navigates to queue", async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();



    try {
      await setupUserBeforeEach(page1);
      await completeInterestSetup(page1,"Computer Science","Dorm A",["Gaming Society"]);
      await setupUserBeforeEach(page2);
      await completeInterestSetup(page2,"Computer Science","Dorm A",["Gaming Society"]);
      console.log("users are set up");
      // Start matching - User 2 first, then User 1
      const user2StartLink = page2.getByRole("link", { name: "Start Matching" });
      await user2StartLink.click();
      await page2.waitForTimeout(5000);

      const user1StartLink = page1.getByRole("link", { name: "Start Matching" });
      await user1StartLink.click();
      await page1.waitForTimeout(5000);
      console.log(`user 1 url ${page1.url()}`);
      console.log(`user 2 url ${page2.url()}`);
      // Extract and verify session IDs match
      const user1SessionId = new URL(page1.url()).searchParams.get("session");
      const user2SessionId = new URL(page2.url()).searchParams.get("session");

      expect(user1SessionId).toBe(user2SessionId);

      // Wait for chat to load
      await page1.waitForLoadState("networkidle");
      await page2.waitForLoadState("networkidle");

      // Click chat history toggle for User 1
      const user1MenuBtn = page1.locator('button[aria-label*="menu"], button[aria-label*="saved"]').first();
      await expect(user1MenuBtn).toBeVisible({ timeout: 5000 });
      await user1MenuBtn.click();
      await page1.waitForTimeout(500);

      console.log("Users are starting to click new match")
      // Click "Start a New Match" button
      const user1StartNewMatchBtn = page1.getByRole("button", { name: "Start a New Match" });
      await expect(user1StartNewMatchBtn).toBeVisible({ timeout: 5000 });
      await user1StartNewMatchBtn.click();

      // Verify User 1 navigated back to match page
      await page1.waitForTimeout(1000);
      console.log(`new user1 link: ${page1.url()}`)
      expect(page1.url()).toContain("/match");

      const user1CancelBtn =page1.locator('button[aria-label="Cancel matching"]');
      await user1CancelBtn.click();
      await page1.waitForURL("**/match", { timeout: 5000 });



      // Click chat history toggle for User 2
      const user2MenuBtn = page2.locator('button[aria-label*="menu"], button[aria-label*="saved"]').first();
      await expect(user2MenuBtn).toBeVisible({ timeout: 5000 });
      await user2MenuBtn.click();
      await page2.waitForTimeout(500);

      // Click "Start a New Match" button
      const user2StartNewMatchBtn = page2.getByRole("button", { name: "Start a New Match" });
      await expect(user2StartNewMatchBtn).toBeVisible({ timeout: 5000 });
      await user2StartNewMatchBtn.click();

      // Verify User 2 navigated back to match page
      await page1.waitForTimeout(1000);
      console.log(`new user2 link: ${page2.url()}`)
      expect(page2.url()).toContain("/match");
      const user2CancelBtn = page2.locator('button[aria-label="Cancel matching"]');
      await user2CancelBtn.click();
      await page2.waitForURL("**/match", { timeout: 5000 });


    } finally {
      await context1.close();
      await context2.close();
    }

    
  });
    test("system notifies other user", async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await setupUserBeforeEach(page1);
      await completeInterestSetup(page1,"Computer Science","Dorm A",["Gaming Society"]);
      await setupUserBeforeEach(page2);
      await completeInterestSetup(page2,"Computer Science","Dorm A",["Gaming Society"]);
      console.log("users are set up");
      // Start matching - User 2 first, then User 1
      const user2StartLink = page2.getByRole("link", { name: "Start Matching" });
      await user2StartLink.click();
      await page2.waitForTimeout(5000);
      await page2.waitForURL("**/match/queue", { timeout: 10000 });

      const user1StartLink = page1.getByRole("link", { name: "Start Matching" });
      await user1StartLink.click();
      await page1.waitForTimeout(5000);
      console.log(`user 1 url ${page1.url()}`);
      console.log(`user 2 url ${page2.url()}`);
      // Extract and verify session IDs match
      const user1SessionId = new URL(page1.url()).searchParams.get("session");
      const user2SessionId = new URL(page2.url()).searchParams.get("session");

      expect(user1SessionId).toBe(user2SessionId);

      // Wait for chat to load
      await page1.waitForLoadState("networkidle");
      await page2.waitForLoadState("networkidle");
      await page1.waitForTimeout(1000);
      await page2.waitForTimeout(1000);


      // Click chat history toggle for User 1
      const user1MenuBtn = page1.locator('button[aria-label*="menu"], button[aria-label*="saved"]').first();
      await user1MenuBtn.click();
      await page1.waitForTimeout(500);

      console.log("Users are starting to click new match")
      // Click "Start a New Match" button
      const user1StartNewMatchBtn = page1.getByRole("button", { name: "Start a New Match" });
      await expect(user1StartNewMatchBtn).toBeVisible({ timeout: 5000 });
      await user1StartNewMatchBtn.click();

      // Verify User 1 navigated back to match page
      await page1.waitForTimeout(1000);
      console.log(`new user1 link: ${page1.url()}`)
      expect(page1.url()).toContain("/match");
      const user1CancelBtn = page1.locator('button[aria-label="Cancel matching"]');
      await user1CancelBtn.click();
      await page1.waitForURL("**/match", { timeout: 5000 });

      // Check for the system message in the chat
      const systemMessage = page2.locator('p:has-text("Your partner has left the chat")');
      await page2.waitForTimeout(5000);
      console.log("System message count:", await systemMessage.count());
      console.log("System message text:", await systemMessage.allTextContents());

    } finally {
      await context1.close();
      await context2.close();
    }

    
  });

   test("user gets matched again after pressing new match", async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const context3 = await browser.newContext();

  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  const page3 = await context3.newPage();

  try {
    await setupUserBeforeEach(page1);
    await setupUserBeforeEach(page2);
    await setupUserBeforeEach(page3);

    await completeInterestSetup(page1,"Computer Science","Dorm A",["Gaming Society"]);
    await completeInterestSetup(page2,"Computer Science","Dorm A",["Gaming Society"]);
    await completeInterestSetup(page3,"Computer Science","Dorm A",["Gaming Society"]);
    console.log("users are set up");
    
    // Start matching - User 2 first, then User 1
    const user2StartLink = page2.getByRole("link", { name: "Start Matching" });
    await user2StartLink.click();
    await page2.waitForTimeout(5000);

    const user1StartLink = page1.getByRole("link", { name: "Start Matching" });
    await user1StartLink.click();
    await page1.waitForTimeout(5000);
    console.log(`user 1 url ${page1.url()}`);
    console.log(`user 2 url ${page2.url()}`);
    
    // Extract and verify session IDs match
    const user1SessionId = new URL(page1.url()).searchParams.get("session");
    const user2SessionId = new URL(page2.url()).searchParams.get("session");

    expect(user1SessionId).toBe(user2SessionId);

    // Wait for chat to load
    await page1.waitForLoadState("networkidle");
    await page2.waitForLoadState("networkidle");

    // Click chat history toggle for User 1
    const user1MenuBtn = page1.locator('button[aria-label*="menu"], button[aria-label*="saved"]').first();
    await user1MenuBtn.click();
    await page1.waitForTimeout(500);

    console.log("Users are starting to click new match")
    // Click "Start a New Match" button - User 1 goes to queue automatically
    const user1StartNewMatchBtn = page1.getByRole("button", { name: "Start a New Match" });
    await expect(user1StartNewMatchBtn).toBeVisible({ timeout: 5000 });
    await user1StartNewMatchBtn.click();

    // Verify User 1 is now in queue
    await page1.waitForURL("**/match/queue", { timeout: 5000 });
    console.log(`User 1 in queue: ${page1.url()}`);

    // User 3 joins queue shortly after - they should match
    await page3.waitForLoadState("networkidle");
    const user3StartLink = page3.getByRole("link", { name: "Start Matching" });
    await expect(user3StartLink).toBeVisible({ timeout: 5000 });
    await user3StartLink.click();

    // Wait for User 3 to reach queue
    await page3.waitForURL("**/match/queue", { timeout: 10000 });
    console.log(`User 3 in queue: ${page3.url()}`);

    // Wait for both to match
    await page1.waitForTimeout(5000);
    await page3.waitForTimeout(5000);

    console.log(`user 1 new url: ${page1.url()}`);
    console.log(`user 3 url: ${page3.url()}`);

    const user1SessionIdV2 = new URL(page1.url()).searchParams.get("session");
    const user3SessionId = new URL(page3.url()).searchParams.get("session");

    expect(user1SessionIdV2).toBe(user3SessionId);

  } finally {
    await context1.close();
    await context2.close();
    await context3.close();
  }
});
});