import type Database from "better-sqlite3";

export function initializeDatabase(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS celebrities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      handle TEXT NOT NULL UNIQUE,
      bio TEXT NOT NULL,
      personality TEXT NOT NULL,
      writing_voice TEXT NOT NULL,
      backstory TEXT NOT NULL,
      attributes TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_celebrities_status ON celebrities(status);

    CREATE TABLE IF NOT EXISTS celebrity_relationships (
      id TEXT PRIMARY KEY,
      celebrity_a_id TEXT NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
      celebrity_b_id TEXT NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('friend', 'rival', 'ex', 'collaborator', 'nemesis', 'family', 'complicated')),
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (celebrity_a_id != celebrity_b_id)
    );

    CREATE INDEX IF NOT EXISTS idx_relationships_a ON celebrity_relationships(celebrity_a_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_b ON celebrity_relationships(celebrity_b_id);
  `);
}
