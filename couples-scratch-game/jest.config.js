/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    // Resolve @/* path aliases to project root
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.[jt]sx?$": [
      "ts-jest",
      {
        tsconfig: {
          // Relax settings for test environment
          strict: false,
          baseUrl: ".",
          paths: { "@/*": ["./*"] },
          esModuleInterop: true,
        },
      },
    ],
  },
  // Map expo-sqlite to our in-memory stub so native modules are never loaded
  moduleNameMapper: {
    "^expo-sqlite$": "<rootDir>/__mocks__/expo-sqlite.js",
    "^@/db/client$": "<rootDir>/__mocks__/db-client.js",
    "^@/(.*)$": "<rootDir>/$1",
  },
  testTimeout: 15000,
};
