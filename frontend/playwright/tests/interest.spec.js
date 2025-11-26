import { test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker";
import { mockSession, login } from "../helpers/login.js";



test.describe("interests tests", () => {
    test.describe.configure({
        repeatEach: 2,
        retries: 1,
    });

    test.beforeEach(async ({ page }) => {
        await mockSession(page);
        await login(page);

        await page.goto("http://localhost:3000/terms");
        await page.getByText("Accept & Continue").click();

        const username = faker.person.firstName() + Math.floor(Math.random() * 9000 + 1000);
        await page.locator('input[placeholder="Username *"]').fill(username);

        await page.getByRole("button", { name: "Continue" }).click();
    });

    test("complete interest", async ({ page }) => {
        
        
        const courseButtons = page.locator(
            'label:has-text("Your Course / Major") + div button'
        );
        
        const courseCount = await courseButtons.count();
        let selectedCourse;
        let courseButton;

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
        await courseButton.innerText();
        await courseButton.click();
        
        const housingButtons = page.locator(
            'label:has-text("Your Housing") + div button'
        );
        
        const housingCount = await housingButtons.count();
        const randomHousingIndex = Math.floor(Math.random() * housingCount);
        
        const housingButton = housingButtons.nth(randomHousingIndex);
        await housingButton.innerText();
        await housingButton.click();
        
        
        const orgButtons = page.locator(
            'p:has-text("Popular organizations:") + div button'
        );
        
        const orgCount = await orgButtons.count();
        const howMany = Math.floor(Math.random() * 3) + 2; 
        
        let selectedOrganizations = [];
        const clickedIndices = new Set();

        while (clickedIndices.size < howMany) {
            const index = Math.floor(Math.random() * orgCount);
            if (!clickedIndices.has(index)) {
                clickedIndices.add(index);

                const btn = orgButtons.nth(index);
                const text = await btn.innerText();
                selectedOrganizations.push(text);

                await btn.click();
                await page.waitForTimeout(200); // small delay for UI
            }
        }
        
        const completeBtn = page.getByRole("button", { name: "Complete Setup" });

        await expect(completeBtn).toBeEnabled({ timeout: 10000 });
        await completeBtn.click();

        await page.waitForURL("**/match");
        const currentURL = page.url();
        expect(currentURL).toBe("http://localhost:3000/match");
    });

    test("missing course/major interest", async ({ page }) => {
        
        
        // const courseButtons = page.locator(
        //     'label:has-text("Your Course / Major") + div button'
        // );
        
        // const courseCount = await courseButtons.count();
        // const randomCourseIndex = Math.floor(Math.random() * courseCount);
        
        // const courseButton = courseButtons.nth(randomCourseIndex);
        // await courseButton.innerText();
        // await courseButton.click();
        
        const housingButtons = page.locator(
            'label:has-text("Your Housing") + div button'
        );
        
        const housingCount = await housingButtons.count();
        const randomHousingIndex = Math.floor(Math.random() * housingCount);
        
        const housingButton = housingButtons.nth(randomHousingIndex);
        await housingButton.innerText();
        await housingButton.click();
        
        
        const orgButtons = page.locator(
            'p:has-text("Popular organizations:") + div button'
        );
        
        const orgCount = await orgButtons.count();
        const howMany = Math.floor(Math.random() * 3) + 2; 
        
        let selectedOrganizations = [];
        const clickedIndices = new Set();

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
        
        const completeBtn = page.getByRole("button", { name: "Complete Setup" });

        await expect(completeBtn).toBeDisabled();
        
    });

    test("missing housing interest", async ({ page }) => {
        
        
        const courseButtons = page.locator(
            'label:has-text("Your Course / Major") + div button'
        );
        
        const courseCount = await courseButtons.count();
        let selectedCourse;
        let courseButton;

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
        await courseButton.innerText();
        await courseButton.click();
        
        // const housingButtons = page.locator(
        //     'label:has-text("Your Housing") + div button'
        // );
        
        // const housingCount = await housingButtons.count();
        // const randomHousingIndex = Math.floor(Math.random() * housingCount);
        
        // const housingButton = housingButtons.nth(randomHousingIndex);
        // await housingButton.innerText();
        // await housingButton.click();
        
        
        const orgButtons = page.locator(
            'p:has-text("Popular organizations:") + div button'
        );
        
        const orgCount = await orgButtons.count();
        const howMany = Math.floor(Math.random() * 3) + 2; 
        
        let selectedOrganizations = [];
        const clickedIndices = new Set();

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
        
        const completeBtn = page.getByRole("button", { name: "Complete Setup" });

        await expect(completeBtn).toBeDisabled();
        
    });

    test("missing organizations interest", async ({ page }) => {
        
        
        const courseButtons = page.locator(
            'label:has-text("Your Course / Major") + div button'
        );
        
        const courseCount = await courseButtons.count();
        let selectedCourse;
        let courseButton;

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
        await courseButton.innerText();
        await courseButton.click();
        
        const housingButtons = page.locator(
            'label:has-text("Your Housing") + div button'
        );
        
        const housingCount = await housingButtons.count();
        const randomHousingIndex = Math.floor(Math.random() * housingCount);
        
        const housingButton = housingButtons.nth(randomHousingIndex);
        await housingButton.innerText();
        await housingButton.click();
        
        
        // const orgButtons = page.locator(
        //     'p:has-text("Popular organizations:") + div button'
        // );
        
        // const orgCount = await orgButtons.count();
        // const howMany = Math.floor(Math.random() * 3) + 2; 
        
        // let selectedOrganizations = [];
        
        // for (let i = 0; i < howMany; i++) {
        //     const index = Math.floor(Math.random() * orgCount);
        //     const btn = orgButtons.nth(index);
            
        //     const text = await btn.innerText();
        //     selectedOrganizations.push(text);
            
        //     await btn.click();
        //     await page.waitForTimeout(200); 
        // }
        
        const completeBtn = page.getByRole("button", { name: "Complete Setup" });

        await expect(completeBtn).toBeDisabled();
        
    });

    test("delete selected organizations", async ({ page }) => {
        
        const orgButtons = page.locator(
            'p:has-text("Popular organizations:") + div button'
        );
        
        const orgCount = await orgButtons.count();
        const howMany = Math.floor(Math.random() * 3) + 4; 
        
        let selectedOrganizations = [];
        const clickedIndices = new Set();

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
        
        let selectedOrgs = page.locator('div.flex.flex-wrap.gap-2 > span');
        while ((await selectedOrgs.count()) > 0) {
            const deleteBtn = selectedOrgs.nth(0).locator('button');
            await deleteBtn.waitFor({ state: "visible" });
            await deleteBtn.click();
            await page.waitForTimeout(100);
            selectedOrgs = page.locator('div.flex.flex-wrap.gap-2 > span');
        }

        await expect(page.locator('div.flex.flex-wrap.gap-2 > span')).toHaveCount(0);

        const completeBtn = page.getByRole("button", { name: "Complete Setup" });
        await expect(completeBtn).toBeDisabled();
    });

    test("add custom organizations", async ({ page }) => {

        const orgInput = page.locator('input[placeholder="Type a club/organization and press Enter..."]');

        const organizations = [];
        for (let i = 0; i < 5; i++) {
            const orgName = faker.company.name();
            organizations.push(orgName);

            await orgInput.fill(orgName);
            await orgInput.press("Enter");
            await page.waitForTimeout(100); 
        }

        await expect(page.locator('div.flex.flex-wrap.gap-2 > span')).toHaveCount(5);
    });

    test("type custom course/major", async ({ page }) => {

        const otherCourseButton = page.locator(
            'label:has-text("Your Course / Major") + div button', 
            { hasText: "Other" }
        );

        await otherCourseButton.click();
        const courseInput = page.locator('input[placeholder="Type your course..."]');

        const customCourse = faker.word.words({ count: 2 }); 

        await courseInput.fill(customCourse);

        await expect(courseInput).toHaveValue(customCourse);
    });

    test("edit profile shows previously entered custom course", async ({ page }) => {
        // Reuse the setup to create a profile with a custom course
        const username = faker.person.firstName() + Math.floor(Math.random() * 9000 + 1000);
        await page.goto("http://localhost:3000/terms");
        await page.getByText("Accept & Continue").click();
        await page.locator('input[placeholder="Username *"]').fill(username);
        await page.getByRole("button", { name: "Continue" }).click();

        const otherCourseButton = page.locator('label:has-text("Your Course / Major") + div button', { hasText: "Other" });
        await otherCourseButton.click();
        const courseInput = page.locator('input[placeholder="Type your course..."]');
        const customCourse = faker.word.words({ count: 2 });
        await courseInput.fill(customCourse);

        const housingButtons = page.locator('label:has-text("Your Housing") + div button');
        await housingButtons.nth(0).click();
        const orgButtons = page.locator('p:has-text("Popular organizations:") + div button');
        await orgButtons.nth(0).click();
        const completeBtn = page.getByRole("button", { name: "Complete Setup" });
        await expect(completeBtn).toBeEnabled({ timeout: 10000 });
        await completeBtn.click();
        await page.waitForURL("**/match");

        // Go to edit profile and verify the custom course input value persists
        await page.goto("http://localhost:3000/profile/edit");
        await page.waitForLoadState("networkidle");
        const editCourseInput = page.locator('input[placeholder="Type your course..."]');
        await expect(editCourseInput).toBeVisible({ timeout: 5000 });
        await expect(editCourseInput).toHaveValue(customCourse);
    });
});
