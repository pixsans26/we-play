// Stub for expo-sqlite — replaced by better-sqlite3 in test environment.
// The real db client mock (db-client.js) is used instead of this module.
const Database = require("better-sqlite3");

function openDatabaseSync(name) {
  return new Database(":memory:");
}

module.exports = { openDatabaseSync };
