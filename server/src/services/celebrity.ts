import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/connection.js";
import type { Celebrity, CelebrityStatus } from "../types.js";

interface CelebrityRow {
  id: string;
  name: string;
  handle: string;
  bio: string;
  personality: string;
  writing_voice: string;
  backstory: string;
  attributes: string;
  status: CelebrityStatus;
  created_at: string;
  updated_at: string;
}

function rowToCelebrity(row: CelebrityRow): Celebrity {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    bio: row.bio,
    personality: row.personality,
    writingVoice: row.writing_voice,
    backstory: row.backstory,
    attributes: JSON.parse(row.attributes),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createCelebrity(
  data: Omit<Celebrity, "id" | "status" | "createdAt" | "updatedAt">
): Celebrity {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO celebrities (id, name, handle, bio, personality, writing_voice, backstory, attributes, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).run(
    id,
    data.name,
    data.handle,
    data.bio,
    data.personality,
    data.writingVoice,
    data.backstory,
    JSON.stringify(data.attributes),
    now,
    now
  );

  return getById(id)!;
}

export function listByStatus(status?: CelebrityStatus): Celebrity[] {
  const db = getDb();
  if (status) {
    const rows = db
      .prepare("SELECT * FROM celebrities WHERE status = ? ORDER BY created_at DESC")
      .all(status) as CelebrityRow[];
    return rows.map(rowToCelebrity);
  }
  const rows = db
    .prepare("SELECT * FROM celebrities ORDER BY created_at DESC")
    .all() as CelebrityRow[];
  return rows.map(rowToCelebrity);
}

export function getById(id: string): Celebrity | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM celebrities WHERE id = ?")
    .get(id) as CelebrityRow | undefined;
  return row ? rowToCelebrity(row) : undefined;
}

export function updateStatus(id: string, status: CelebrityStatus): Celebrity | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db
    .prepare("UPDATE celebrities SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, now, id);

  if (result.changes === 0) return undefined;
  return getById(id);
}

export function getCounts(): { pending: number; approved: number; denied: number } {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied
      FROM celebrities`
    )
    .get() as { pending: number; approved: number; denied: number };
  return {
    pending: row.pending || 0,
    approved: row.approved || 0,
    denied: row.denied || 0,
  };
}
