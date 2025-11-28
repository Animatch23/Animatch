import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const babelConfigPath = path.join(rootDir, "babel.config.js");

export default {
  rootDir,
  testEnvironment: "node",
  testTimeout: 30000,
  coverageDirectory: path.join(rootDir, "coverage"),
  collectCoverageFrom: [path.join(rootDir, "src/**/*.{js,jsx}")],
  testMatch: [
    path.join(rootDir, "__tests__/**/*.test.js"),
    path.join(rootDir, "src/__tests__/**/*.test.js"),
    path.join(rootDir, "src/__tests__/**/*_test.js")
  ],
  setupFilesAfterEnv: [path.join(rootDir, "setupTests.js")],
  transform: {
    "^.+\\.jsx?$": ["babel-jest", { configFile: babelConfigPath }]
  },
  moduleFileExtensions: ["js", "json"],
  clearMocks: true,
  restoreMocks: true,
  moduleDirectories: ["node_modules", path.join(rootDir, "src")],
  moduleNameMapper: {
     "^.+/utils/fs\\.js$": path.join(rootDir, "__mocks__/fs.cjs"),
     "^node-cron$": path.join(rootDir, "__mocks__/node-cron.cjs"),
     "^multer$": path.join(rootDir, "__mocks__/multer.cjs")
  }
};