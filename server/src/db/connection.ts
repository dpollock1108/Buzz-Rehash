import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

let db: Database.Database | null = null;

// Repo root, so relative DATABASE_PATH values resolve the same no matter
// which workspace directory the process is started from.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export function getDb(): Database.Database {
  if (!db) {
    const configured = process.env.DATABASE_PATH || "./server/data/buzz-rehash.db";
    const dbPath = path.isAbsolute(configured) ? configured : path.resolve(repoRoot, configured);
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}
