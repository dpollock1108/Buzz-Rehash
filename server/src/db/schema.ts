import type Database from "better-sqlite3";

const RELATIONSHIP_TYPES =
  "'friend', 'rival', 'ex', 'collaborator', 'nemesis', 'family', 'complicated', 'dating', 'engaged', 'married', 'situationship'";

// The original relationships table had a narrower CHECK constraint (no romantic
// types). SQLite can't alter a CHECK in place, so rebuild the table if the old
// constraint is detected, preserving any rows.
// Phase QOL: influencers can be retired (dormant but revivable).
function migrateCelebritiesTable(db: Database.Database): void {
  const columns = db.prepare("PRAGMA table_info(celebrities)").all() as { name: string }[];
  if (columns.length === 0) return;
  if (!columns.some((c) => c.name === "retired")) {
    db.exec("ALTER TABLE celebrities ADD COLUMN retired INTEGER NOT NULL DEFAULT 0");
  }
}

function migrateRelationshipsTable(db: Database.Database): void {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'celebrity_relationships'")
    .get() as { sql: string } | undefined;
  if (!row || row.sql.includes("'dating'")) return;

  db.exec(`
    ALTER TABLE celebrity_relationships RENAME TO celebrity_relationships_old;

    CREATE TABLE celebrity_relationships (
      id TEXT PRIMARY KEY,
      celebrity_a_id TEXT NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
      celebrity_b_id TEXT NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN (${RELATIONSHIP_TYPES})),
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (celebrity_a_id != celebrity_b_id)
    );

    INSERT INTO celebrity_relationships SELECT * FROM celebrity_relationships_old;
    DROP TABLE celebrity_relationships_old;
  `);
}

// Likes were originally keyed by a free-form user_handle. Phase 3 ties them to
// real user accounts; rebuild the table if the old shape is detected (dev-era
// likes are discarded — they had no real identity to migrate).
function migrateLikesTable(db: Database.Database): void {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'likes'")
    .get() as { sql: string } | undefined;
  if (!row || !row.sql.includes("user_handle")) return;
  db.exec(`
    DROP TABLE likes;
    CREATE TABLE likes (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (post_id, user_id)
    );
    CREATE INDEX idx_likes_post ON likes(post_id);
  `);
}

// Comments gain a user_id once accounts exist; author_name stays as the
// denormalized display name so old rows keep rendering.
function migrateCommentsTable(db: Database.Database): void {
  const columns = db.prepare("PRAGMA table_info(comments)").all() as { name: string }[];
  if (columns.length === 0) return;
  if (!columns.some((c) => c.name === "user_id")) {
    db.exec("ALTER TABLE comments ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL");
  }
  // Phase 4: celebrities can reply inside their own comment threads
  if (!columns.some((c) => c.name === "celebrity_id")) {
    db.exec(
      "ALTER TABLE comments ADD COLUMN celebrity_id TEXT REFERENCES celebrities(id) ON DELETE SET NULL"
    );
  }
}

export function initializeDatabase(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL CHECK (provider IN ('oidc', 'dev')),
      subject TEXT NOT NULL,
      email TEXT,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (provider, subject)
    );

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
      retired INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_celebrities_status ON celebrities(status);

    CREATE TABLE IF NOT EXISTS celebrity_relationships (
      id TEXT PRIMARY KEY,
      celebrity_a_id TEXT NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
      celebrity_b_id TEXT NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN (${RELATIONSHIP_TYPES})),
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (celebrity_a_id != celebrity_b_id)
    );

    CREATE INDEX IF NOT EXISTS idx_relationships_a ON celebrity_relationships(celebrity_a_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_b ON celebrity_relationships(celebrity_b_id);

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('feud', 'romance', 'breakup', 'scandal', 'collab', 'announcement', 'mishap', 'milestone')),
      status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'active', 'resolved', 'denied')),
      relationship_changes TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

    CREATE TABLE IF NOT EXISTS event_participants (
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      celebrity_id TEXT NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      PRIMARY KEY (event_id, celebrity_id)
    );

    CREATE INDEX IF NOT EXISTS idx_event_participants_celebrity ON event_participants(celebrity_id);

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      celebrity_id TEXT NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
      reply_to_post_id TEXT REFERENCES posts(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_posts_celebrity ON posts(celebrity_id);
    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
    CREATE INDEX IF NOT EXISTS idx_posts_event ON posts(event_id);

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      celebrity_id TEXT REFERENCES celebrities(id) ON DELETE SET NULL,
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (post_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tick_runs (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      trigger TEXT NOT NULL CHECK (trigger IN ('scheduled', 'manual')),
      summary TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS celebrity_memories (
      id TEXT PRIMARY KEY,
      celebrity_id TEXT NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      source_type TEXT NOT NULL CHECK (source_type IN ('event', 'post', 'relationship', 'manual')),
      source_id TEXT,
      importance INTEGER NOT NULL DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_memories_celebrity ON celebrity_memories(celebrity_id);
  `);

  migrateCelebritiesTable(db);
  migrateRelationshipsTable(db);
  migrateLikesTable(db);
  migrateCommentsTable(db);
}
