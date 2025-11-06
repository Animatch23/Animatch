module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  extensionsToTreatAsEsm: [".js"],
  transform: {
    "^.+\\.js$": ["babel-jest", { presets: ["@babel/preset-env"] }]
  },
  moduleFileExtensions: ["js", "json"],
  collectCoverageFrom: ["src/**/*.js", "!src/**/server.js"],
};