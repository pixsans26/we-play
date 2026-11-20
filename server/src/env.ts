import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Determine which env file to load:
// Priority:
// 1. Explicit ENV_FILE (e.g. ENV_FILE=.env.production)
// 2. NODE_ENV === 'production' -> .env.production
// 3. Default -> .env.local
const nodeEnv = process.env.NODE_ENV || "development";
const customEnv = process.env.ENV_FILE;

const candidates = customEnv
  ? [customEnv]
  : nodeEnv === "production"
  ? [".env.production", ".env.local"]
  : [".env.local", ".env.production"];

for (const file of candidates) {
  const fullPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath });
    break;
  }
}
