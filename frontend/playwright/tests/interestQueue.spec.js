import { test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker";
import { mockSession, login } from "../helpers/login.js";

test.describe("interest queue tests", () => {
    test.describe.configure({
        repeatEach: 1,
        retries: 1,
    });

    // Helper function to setup user through beforeEach steps
    const setupUserBeforeEach = async (page) => {
        await mockSession(page);
        await login(page);

        await page.goto("http://localhost:3000/terms");
        await page.getByText("Accept & Continue").click();

        const username = faker.person.firstName() + Math.floor(Math.random() * 9000 + 1000);
        await page.locator('input[placeholder="Username *"]').fill(username);

        await page.getByRole("button", { name: "Continue" }).click();
        
        return username;
    };

    // Helper function to complete interests
    // Helper function to complete interests
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

    //Sets the interests from select interests
    const setInterestsViaPage = async (page, interests) => {
        await page.goto("http://localhost:3000/profile/interests?from=match");
        
        // Wait for the loading state to finish and the main content to appear
        await expect(page.getByRole("heading", { name: "Select Interests" })).toBeVisible({ timeout: 15000 });

        console.log(`Adding ${interests.length} interests...`);

        for (const interest of interests) {
            // Click the suggested topic button
            const topicButton = page.getByRole("button", { name: interest }).first();
            const isVisible = await topicButton.isVisible().catch(() => false);
            
            if (isVisible) {
                await topicButton.click();
                await page.waitForTimeout(200);
                console.log(`✓ Added interest: ${interest}`);
            } else {
                console.log(`⚠ Button for "${interest}" not found, skipping`);
            }
        }

        // Click Save button
        const saveBtn = page.getByRole("button", { name: "Save" });
        await expect(saveBtn).toBeEnabled({ timeout: 5000 });
        await saveBtn.click();
        
        await page.waitForURL("**/match", { timeout: 10000 });
        console.log(`✓ Interests saved and redirected to /match`);
    };

    test("queue matching with 3 users - similar and different interests", async ({ browser }) => {
        // Create 3 browser contexts for 3 different users
        console.log("Creating 3 browser contexts...");
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const context3 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();
        const page3 = await context3.newPage();

        try {
            // Setup User 1
                        // Setup User 1 with specific interests
            console.log("\n[User 1] Starting setup...");
            const user1Username = await setupUserBeforeEach(page1);
            console.log(`[User 1] Username: ${user1Username}`);
            
            console.log("[User 1] Completing interests...");
            const user1Interests = await completeInterestSetup(page1, "Computer Science", "Dorm A", ["Gaming Society"]);
            console.log(`[User 1] Setup complete - Course: ${user1Interests.selectedCourse}, Housing: ${user1Interests.selectedHousing}, Orgs: ${user1Interests.selectedOrganizations.join(", ")}`);

            // Setup User 2 with same interests (similar to User 1)
            console.log("\n[User 2] Starting setup...");
            const user2Username = await setupUserBeforeEach(page2);
            console.log(`[User 2] Username: ${user2Username}`);
            
            console.log("[User 2] Completing interests...");
            const user2Interests = await completeInterestSetup(page2, "Computer Science", "Dorm A", ["Anime Club", "Sports Club"]);
            console.log(`[User 2] Setup complete - Course: ${user2Interests.selectedCourse}, Housing: ${user2Interests.selectedHousing}, Orgs: ${user2Interests.selectedOrganizations.join(", ")}`);

            // Setup User 3 with different interests
            console.log("\n[User 3] Starting setup...");
            const user3Username = await setupUserBeforeEach(page3);
            console.log(`[User 3] Username: ${user3Username}`);
            
            console.log("[User 3] Completing interests...");
            const user3Interests = await completeInterestSetup(page3, "Business", "Dorm B", ["Debate Team", "Tech Club"]);
            console.log(`[User 3] Setup complete - Course: ${user3Interests.selectedCourse}, Housing: ${user3Interests.selectedHousing}, Orgs: ${user3Interests.selectedOrganizations.join(", ")}`);

            // Wait for queue to process
            console.log("\nWaiting for queue to process...");
            await page1.waitForTimeout(2000);

            // Verify all users are on match page
            console.log("\n=== Verifying all users on match page ===");
            expect(page1.url()).toContain("/match");
            console.log(`✓ User 1 URL: ${page1.url()}`);
            
            expect(page2.url()).toContain("/match");
            console.log(`✓ User 2 URL: ${page2.url()}`);
            
            expect(page3.url()).toContain("/match");
            console.log(`✓ User 3 URL: ${page3.url()}`);

            // Click "Start Matching" button - User 3 first, then User 2, then User 1
            console.log("\n=== Clicking Start Matching buttons ===");
            
            console.log("[User 3] Clicking Start Matching...");
            const user3StartLink = page3.getByRole("link", { name: "Start Matching" });
            await expect(user3StartLink).toBeVisible({ timeout: 5000 });
            await user3StartLink.click();
            await page3.waitForURL("**/match/queue", { timeout: 10000 });
            console.log("✓ User 3 clicked Start Matching");

            console.log("[User 2] Clicking Start Matching...");
            const user2StartLink = page2.getByRole("link", { name: "Start Matching" });
            await expect(user2StartLink).toBeVisible({ timeout: 5000 });
            await user2StartLink.click();
            await page2.waitForURL("**/match/queue", { timeout: 10000 });
            console.log("✓ User 2 clicked Start Matching");

            console.log("[User 1] Clicking Start Matching...");
            const user1StartLink = page1.getByRole("link", { name: "Start Matching" });
            await expect(user1StartLink).toBeVisible({ timeout: 5000 });
            await user1StartLink.click();
            await page1.waitForURL("**/match/queue", { timeout: 10000 });
            console.log("✓ User 1 clicked Start Matching");

            // Wait for matching to process
            await page1.waitForTimeout(10000);

            const user1ChatURL = page1.url();
            const user2ChatURL = page2.url();
            const user3ChatURL = page3.url();

            console.log(`\nUser 1 url: ${user1ChatURL}`);
            console.log(`User 2 url: ${user2ChatURL}`);
            // Extract session IDs from URLs
            const user1SessionId = new URL(user1ChatURL).searchParams.get("session");
            const user2SessionId = new URL(user2ChatURL).searchParams.get("session");
            const user3SessionId = new URL(user3ChatURL).searchParams.get("session");

            console.log(`\nUser 1 Session ID: ${user1SessionId}`);
            console.log(`User 2 Session ID: ${user2SessionId}`);
            console.log(`User 3 Session ID: ${user3SessionId}`);

            // Verify User 1 and User 2 have the same session ID (matched)
            console.log("\n=== Verifying matches ===");
            expect(user1SessionId).toBe(user2SessionId)
            expect(user3SessionId).toBeNull();
            const user3CancelBtn = page3.locator('button[aria-label="Cancel matching"]');
            await expect(user3CancelBtn).toBeVisible({ timeout: 5000 });
            await user3CancelBtn.click();
            await page3.waitForURL("**/match", { timeout: 5000 });
            console.log("✓ User 3 left queue");
            console.log("\n✓✓✓ All tests passed! ✓✓✓");

        } finally {
            await context1.close();
            await context2.close();
            await context3.close();
            console.log("\nAll contexts closed.");
        }
    });


        test("queue matching with 3 users - similar and different interests using select interests", async ({ browser }) => {
        test.setTimeout(60000);
        // Create 3 browser contexts for 3 different users
        console.log("Creating 3 browser contexts...");
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const context3 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();
        const page3 = await context3.newPage();

        try {
            // Setup User 1
                        // Setup User 1 with specific interests
            console.log("\n[User 1] Starting setup...");
            const user1Username = await setupUserBeforeEach(page1);
            console.log(`[User 1] Username: ${user1Username}`);
            
            console.log("[User 1] Completing interests...");
            const user1Interests = await completeInterestSetup(page1, "Engineering", "Dorm A", ["Gaming Society"]);
            console.log(`[User 1] Setup complete - Course: ${user1Interests.selectedCourse}, Housing: ${user1Interests.selectedHousing}, Orgs: ${user1Interests.selectedOrganizations.join(", ")}`);

            // Setup User 2 with same interests (similar to User 1)
            console.log("\n[User 2] Starting setup...");
            const user2Username = await setupUserBeforeEach(page2);
            console.log(`[User 2] Username: ${user2Username}`);
            
            console.log("[User 2] Completing interests...");
            const user2Interests = await completeInterestSetup(page2, "Computer Science", "Dorm B", ["Sports Club"]);
            console.log(`[User 2] Setup complete - Course: ${user2Interests.selectedCourse}, Housing: ${user2Interests.selectedHousing}, Orgs: ${user2Interests.selectedOrganizations.join(", ")}`);

            // Setup User 3 with different interests
            console.log("\n[User 3] Starting setup...");
            const user3Username = await setupUserBeforeEach(page3);
            console.log(`[User 3] Username: ${user3Username}`);
            
            console.log("[User 3] Completing interests...");
            const user3Interests = await completeInterestSetup(page3, "Business", "Dorm C", ["Debate Team", "Tech Club"]);
            console.log(`[User 3] Setup complete - Course: ${user3Interests.selectedCourse}, Housing: ${user3Interests.selectedHousing}, Orgs: ${user3Interests.selectedOrganizations.join(", ")}`);

            // Wait for queue to process
            console.log("\nWaiting for queue to process...");
            await page1.waitForTimeout(2000);

            // Verify all users are on match page
            console.log("\n=== Verifying all users on match page ===");
            expect(page1.url()).toContain("/match");
            console.log(`✓ User 1 URL: ${page1.url()}`);
            
            expect(page2.url()).toContain("/match");
            console.log(`✓ User 2 URL: ${page2.url()}`);
            
            expect(page3.url()).toContain("/match");
            console.log(`✓ User 3 URL: ${page3.url()}`);

            console.log("\n=== Clicking Select Interest button Matching buttons ===");

            const similarInterests = [
                "Anime",
                "Gaming",
                "Technology",
                "Movies",
                "Music",
                "Art",
                "Books",
                "Sports"
            ];

            console.log("\n[User 1] Adding 8 similar interests via buttons...");
            await setInterestsViaPage(page1, similarInterests);

            console.log("\n[User 2] Adding 8 similar interests via buttons...");
            await setInterestsViaPage(page2, similarInterests);

            // Click "Start Matching" button - User 3 first, then User 2, then User 1
            console.log("\n=== Clicking Start Matching buttons ===");
            
            console.log("[User 3] Clicking Start Matching...");
            const user3StartLink = page3.getByRole("link", { name: "Start Matching" });
            await expect(user3StartLink).toBeVisible({ timeout: 5000 });
            await user3StartLink.click();
            await page3.waitForURL("**/match/queue", { timeout: 10000 });
            console.log("✓ User 3 clicked Start Matching");

            console.log("[User 2] Clicking Start Matching...");
            const user2StartLink = page2.getByRole("link", { name: "Start Matching" });
            await expect(user2StartLink).toBeVisible({ timeout: 5000 });
            await user2StartLink.click();
            await page2.waitForURL("**/match/queue", { timeout: 10000 });
            console.log("✓ User 2 clicked Start Matching");

            console.log("[User 1] Clicking Start Matching...");
            const user1StartLink = page1.getByRole("link", { name: "Start Matching" });
            await expect(user1StartLink).toBeVisible({ timeout: 5000 });
            await user1StartLink.click();
            await page1.waitForURL("**/match/queue", { timeout: 10000 });
            console.log("✓ User 1 clicked Start Matching");

            // Wait for matching to process
            await page1.waitForTimeout(10000);

            const user1ChatURL = page1.url();
            const user2ChatURL = page2.url();
            const user3ChatURL = page3.url();

            console.log(`\nUser 1 url: ${user1ChatURL}`);
            console.log(`User 2 url: ${user2ChatURL}`);
            // Extract session IDs from URLs
            const user1SessionId = new URL(user1ChatURL).searchParams.get("session");
            const user2SessionId = new URL(user2ChatURL).searchParams.get("session");
            const user3SessionId = new URL(user3ChatURL).searchParams.get("session");

            console.log(`\nUser 1 Session ID: ${user1SessionId}`);
            console.log(`User 2 Session ID: ${user2SessionId}`);
            console.log(`User 3 Session ID: ${user3SessionId}`);

            // Verify User 1 and User 2 have the same session ID (matched)
            console.log("\n=== Verifying matches ===");
            expect(user1SessionId).toBe(user2SessionId)
            expect(user3SessionId).toBeNull();
            const user3CancelBtn = page3.locator('button[aria-label="Cancel matching"]');
            await expect(user3CancelBtn).toBeVisible({ timeout: 5000 });
            await user3CancelBtn.click();
            await page3.waitForURL("**/match", { timeout: 5000 });
            console.log("✓ User 3 left queue");
            console.log("\n✓✓✓ All tests passed! ✓✓✓");

        } finally {
            await context1.close();
            await context2.close();
            await context3.close();
            console.log("\nAll contexts closed.");
        }
    });

    test("allow saving zero interests (remove all and save)", async ({ page }) => {
        await mockSession(page);
        await login(page);

        await page.goto("http://localhost:3000/terms");
        await page.getByText("Accept & Continue").click();

        const username = faker.person.firstName() + Math.floor(Math.random() * 9000 + 1000);
        await page.locator('input[placeholder="Username *"]').fill(username);
        await page.getByRole("button", { name: "Continue" }).click();

        // Setup minimal course, housing and orgs
        const courseButtons = page.locator('label:has-text("Your Course / Major") + div button');
        await courseButtons.nth(0).click();
        const housingButtons = page.locator('label:has-text("Your Housing") + div button');
        await housingButtons.nth(0).click();
        const orgButtons = page.locator('p:has-text("Popular organizations:") + div button');
        await orgButtons.nth(0).click();
        const completeBtn = page.getByRole("button", { name: "Complete Setup" });
        await expect(completeBtn).toBeEnabled({ timeout: 10000 });
        await completeBtn.click();
        await page.waitForURL("**/match", { timeout: 15000 });

        // Navigate to interests page
        await page.goto("http://localhost:3000/profile/interests?from=match");
        await page.waitForLoadState("networkidle");

        // Add an interest, then remove it
        const topicBtn = page.getByRole("button", { name: "Music" }).first();
        await topicBtn.click();
        await page.waitForTimeout(200);
        const removeBtn = page.getByRole('button', { name: 'Remove Music' }).first();
        if (await removeBtn.isVisible().catch(() => false)) {
            await removeBtn.click();
            await page.waitForTimeout(200);
        }

        // Ensure Save is enabled even after removing all
        const saveBtn = page.getByRole("button", { name: "Save" });
        await expect(saveBtn).toBeEnabled({ timeout: 5000 });
        await saveBtn.click();
        await page.waitForURL("**/match", { timeout: 10000 });
    });
});