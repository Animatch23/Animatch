import { defineConfig } from "@playwright/test";

export default defineConfig({
  timeout: 75000,
  testDir: "./playwright/tests",

  reporter: [
    ["list"],
    ["html", { open: "never" }]
  ],

  workers: 1,
  retries: 0,
});