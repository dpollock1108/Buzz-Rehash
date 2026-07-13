import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/connection.js";
import type { CelebrityMemory, MemorySourceType } from "../types.js";

interface MemoryRow {
  id: string;
  celebrity_id: string;
  content: string;
  source_type: MemorySourceType;
  source_id: string | null;
  importance: number;
  created_at: string;
}

function rowToMemory(row: MemoryRow): CelebrityMemory {
  return {
    id: row.id,
    celebrityId: row.celebrity_id,
    content: row.content,
    sourceType: row.source_type,
    sourceId: row.source_id ?? undefined,
    importance: row.importance,
    createdAt: row.created_at,
  };
}

export function addMemory(data: {
  celebrityId: string;
  content: string;
  sourceType: MemorySourceType;
  sourceId?: string;
  importance?: number;
}): CelebrityMemory {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO celebrity_memories (id, celebrity_id, content, source_type, source_id, importance, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.celebrityId,
    data.content,
    data.sourceType,
    data.sourceId ?? null,
    data.importance ?? 5,
    now
  );
  return getMemoryById(id)!;
}

function getMemoryById(id: string): CelebrityMemory | undefined {
  const row = getDb()
    .prepare("SELECT * FROM celebrity_memories WHERE id = ?")
    .get(id) as MemoryRow | undefined;
  return row ? rowToMemory(row) : undefined;
}

export function listMemories(celebrityId: string, limit = 50): CelebrityMemory[] {
  const rows = getDb()
    .prepare(
      "SELECT * FROM celebrity_memories WHERE celebrity_id = ? ORDER BY created_at DESC LIMIT ?"
    )
    .all(celebrityId, limit) as MemoryRow[];
  return rows.map(rowToMemory);
}

/**
 * Memories to feed into a generation prompt: the most important ones plus the
 * most recent ones, deduplicated.
 */
export function getMemoriesForContext(celebrityId: string, limit = 12): CelebrityMemory[] {
  const db = getDb();
  const important = db
    .prepare(
      "SELECT * FROM celebrity_memories WHERE celebrity_id = ? ORDER BY importance DESC, created_at DESC LIMIT ?"
    )
    .all(celebrityId, limit) as MemoryRow[];
  const recent = db
    .prepare(
      "SELECT * FROM celebrity_memories WHERE celebrity_id = ? ORDER BY created_at DESC LIMIT ?"
    )
    .all(celebrityId, Math.ceil(limit / 2)) as MemoryRow[];

  const seen = new Set<string>();
  const merged: MemoryRow[] = [];
  for (const row of [...important, ...recent]) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      merged.push(row);
    }
  }
  return merged.slice(0, limit).map(rowToMemory);
}
