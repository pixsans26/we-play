/**
 * In-memory SQLite database for tests.
 * Uses better-sqlite3 + drizzle-orm/better-sqlite3 so all Drizzle queries
 * work identically to the production expo-sqlite path — no mocking of SQL.
 *
 * A fresh in-memory DB is created per test file (Jest module isolation).
 */
const Database = require("better-sqlite3");
const { drizzle } = require("drizzle-orm/better-sqlite3");
const schema = require("../db/schema");

const sqlite = new Database(":memory:");

// Create tables matching db/migrate.ts
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS couple (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_a_uid TEXT NOT NULL,
    partner_b_uid TEXT,
    partner_a_name TEXT NOT NULL,
    partner_b_name TEXT,
    partner_a_age INTEGER,
    partner_b_age INTEGER,
    partner_a_gender TEXT,
    partner_b_gender TEXT,
    what_a_likes TEXT,
    what_b_likes TEXT,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS user_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_uid TEXT NOT NULL,
    task_id TEXT NOT NULL,
    task_type TEXT NOT NULL,
    scratched_at INTEGER,
    completed INTEGER DEFAULT 0,
    skipped INTEGER DEFAULT 0,
    time_taken REAL
  );

  CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_uid TEXT NOT NULL UNIQUE,
    scratch_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    created_at INTEGER,
    updated_at INTEGER
  );
`);

const db = drizzle(sqlite, { schema });

module.exports = { db };
