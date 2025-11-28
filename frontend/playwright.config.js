import { defineConfig } from "@playwright/test";

export default defineConfig({
  timeout: 75000,
  testDir: "./playwright/tests",

  reporter: [
    ["list"],
    ["html", { open: "never" }]
  ],

  use: {
    trace: 'on-first-retry', // Record traces only when retrying a test (saves resources)
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  workers: 1,
  retries: 0,
});