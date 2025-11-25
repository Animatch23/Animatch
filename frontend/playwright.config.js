import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright/tests",
  reporter: "list",
  repeatEach: 2,
  workers: 2, 
});
