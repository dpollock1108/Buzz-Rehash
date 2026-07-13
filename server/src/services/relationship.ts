import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/connection.js";
import type { RelationshipType, RelationshipWithNames } from "../types.js";

interface RelationshipRow {
  id: string;
  celebrity_a_id: string;
  celebrity_b_id: string;
  type: RelationshipType;
  description: string | null;
  created_at: string;
  updated_at: string;
  a_name: string;
  a_handle: string;
  b_name: string;
  b_handle: string;
}

const SELECT_WITH_NAMES = `
  SELECT r.*, a.name AS a_name, a.handle AS a_handle, b.name AS b_name, b.handle AS b_handle
  FROM celebrity_relationships r
  JOIN celebrities a ON a.id = r.celebrity_a_id
  JOIN celebrities b ON b.id = r.celebrity_b_id
`;

function rowToRelationship(row: RelationshipRow): RelationshipWithNames {
  return {
    id: row.id,
    celebrityAId: row.celebrity_a_id,
    celebrityBId: row.celebrity_b_id,
    type: row.type,
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    celebrityAName: row.a_name,
    celebrityAHandle: row.a_handle,
    celebrityBName: row.b_name,
    celebrityBHandle: row.b_handle,
  };
}

export function listRelationships(celebrityId?: string): RelationshipWithNames[] {
  const db = getDb();
  const rows = (
    celebrityId
      ? db
          .prepare(`${SELECT_WITH_NAMES} WHERE r.celebrity_a_id = ? OR r.celebrity_b_id = ? ORDER BY r.created_at DESC`)
          .all(celebrityId, celebrityId)
      : db.prepare(`${SELECT_WITH_NAMES} ORDER BY r.created_at DESC`).all()
  ) as RelationshipRow[];
  return rows.map(rowToRelationship);
}

export function getRelationshipById(id: string): RelationshipWithNames | undefined {
  const row = getDb()
    .prepare(`${SELECT_WITH_NAMES} WHERE r.id = ?`)
    .get(id) as RelationshipRow | undefined;
  return row ? rowToRelationship(row) : undefined;
}

/** Find the relationship between two celebrities regardless of column order. */
export function findBetween(idA: string, idB: string): RelationshipWithNames | undefined {
  const row = getDb()
    .prepare(
      `${SELECT_WITH_NAMES}
       WHERE (r.celebrity_a_id = ? AND r.celebrity_b_id = ?)
          OR (r.celebrity_a_id = ? AND r.celebrity_b_id = ?)`
    )
    .get(idA, idB, idB, idA) as RelationshipRow | undefined;
  return row ? rowToRelationship(row) : undefined;
}

export function createRelationship(data: {
  celebrityAId: string;
  celebrityBId: string;
  type: RelationshipType;
  description?: string;
}): RelationshipWithNames {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO celebrity_relationships (id, celebrity_a_id, celebrity_b_id, type, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, data.celebrityAId, data.celebrityBId, data.type, data.description ?? null, now, now);
  return getRelationshipById(id)!;
}

export function updateRelationship(
  id: string,
  data: { type?: RelationshipType; description?: string }
): RelationshipWithNames | undefined {
  const existing = getRelationshipById(id);
  if (!existing) return undefined;
  const now = new Date().toISOString();
  getDb()
    .prepare("UPDATE celebrity_relationships SET type = ?, description = ?, updated_at = ? WHERE id = ?")
    .run(data.type ?? existing.type, data.description ?? existing.description ?? null, now, id);
  return getRelationshipById(id);
}

export function deleteRelationship(id: string): boolean {
  const result = getDb().prepare("DELETE FROM celebrity_relationships WHERE id = ?").run(id);
  return result.changes > 0;
}

/** Create or update the relationship between two celebrities (used by events). */
export function upsertBetween(data: {
  celebrityAId: string;
  celebrityBId: string;
  type: RelationshipType;
  description?: string;
}): RelationshipWithNames {
  const existing = findBetween(data.celebrityAId, data.celebrityBId);
  if (existing) {
    return updateRelationship(existing.id, { type: data.type, description: data.description })!;
  }
  return createRelationship(data);
}

export function removeBetween(idA: string, idB: string): boolean {
  const existing = findBetween(idA, idB);
  return existing ? deleteRelationship(existing.id) : false;
}
