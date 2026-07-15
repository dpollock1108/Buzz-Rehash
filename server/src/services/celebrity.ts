import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/connection.js";
import { addMemory } from "./memory.js";
import type { Celebrity, CelebrityEdit, CelebrityStatus } from "../types.js";

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
  retired: number;
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
    retired: row.retired === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class HandleTakenError extends Error {
  constructor() {
    super("That handle is already taken");
    this.name = "HandleTakenError";
  }
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

/**
 * The cast that actively participates in the world: approved and not retired.
 * Retired influencers still exist (feed, relationships, memories) but are never
 * auto-selected to post, reply, comment, or join new events.
 */
export function listActiveCast(): Celebrity[] {
  const rows = getDb()
    .prepare("SELECT * FROM celebrities WHERE status = 'approved' AND retired = 0 ORDER BY created_at DESC")
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

export function setRetired(id: string, retired: boolean): Celebrity | undefined {
  const db = getDb();
  const result = db
    .prepare("UPDATE celebrities SET retired = ?, updated_at = ? WHERE id = ?")
    .run(retired ? 1 : 0, new Date().toISOString(), id);
  if (result.changes === 0) return undefined;
  return getById(id);
}

const COLUMN_BY_FIELD: Record<keyof CelebrityEdit, string> = {
  name: "name",
  handle: "handle",
  bio: "bio",
  personality: "personality",
  writingVoice: "writing_voice",
  backstory: "backstory",
  attributes: "attributes",
};

/** Traits whose change is worth an in-world "rebrand" memory. */
const SIGNIFICANT_FIELDS: (keyof CelebrityEdit)[] = [
  "name",
  "personality",
  "writingVoice",
  "backstory",
];

function buildRebrandMemory(before: Celebrity, edit: CelebrityEdit): string | null {
  const changes = SIGNIFICANT_FIELDS.filter(
    (f) => edit[f] !== undefined && String(edit[f]) !== String(before[f])
  );
  if (changes.length === 0) return null;

  const parts: string[] = [];
  if (changes.includes("name") && edit.name) {
    parts.push(`I changed my name from ${before.name} to ${edit.name}`);
  }
  const personaChanged = changes.some((f) => f !== "name");
  if (personaChanged) {
    parts.push("I reinvented my whole persona — new vibe, new voice, new era");
  }
  return `${parts.join(". ")}. It's a fresh chapter and I'm leaning into it.`;
}

/**
 * Edit an influencer's fields. If a significant trait changes on an approved
 * influencer, records a first-person "rebrand" memory so they remember evolving.
 * Throws HandleTakenError if the new handle collides with another influencer.
 */
export function updateCelebrity(id: string, edit: CelebrityEdit): Celebrity | undefined {
  const db = getDb();
  const before = getById(id);
  if (!before) return undefined;

  if (edit.handle && edit.handle !== before.handle) {
    const clash = db
      .prepare("SELECT id FROM celebrities WHERE handle = ? AND id != ?")
      .get(edit.handle, id) as { id: string } | undefined;
    if (clash) throw new HandleTakenError();
  }

  const setClauses: string[] = [];
  const params: unknown[] = [];
  for (const field of Object.keys(COLUMN_BY_FIELD) as (keyof CelebrityEdit)[]) {
    if (edit[field] === undefined) continue;
    setClauses.push(`${COLUMN_BY_FIELD[field]} = ?`);
    params.push(field === "attributes" ? JSON.stringify(edit.attributes) : edit[field]);
  }

  if (setClauses.length > 0) {
    params.push(new Date().toISOString(), id);
    db.prepare(
      `UPDATE celebrities SET ${setClauses.join(", ")}, updated_at = ? WHERE id = ?`
    ).run(...params);
  }

  if (before.status === "approved") {
    const memory = buildRebrandMemory(before, edit);
    if (memory) {
      addMemory({ celebrityId: id, content: memory, sourceType: "manual", importance: 6 });
    }
  }

  return getById(id);
}

export function getCounts(): {
  pending: number;
  approved: number;
  denied: number;
  retired: number;
} {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' AND retired = 0 THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied,
        SUM(CASE WHEN retired = 1 THEN 1 ELSE 0 END) as retired
      FROM celebrities`
    )
    .get() as { pending: number; approved: number; denied: number; retired: number };
  return {
    pending: row.pending || 0,
    approved: row.approved || 0,
    denied: row.denied || 0,
    retired: row.retired || 0,
  };
}
