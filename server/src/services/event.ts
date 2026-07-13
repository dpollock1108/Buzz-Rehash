import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/connection.js";
import type {
  EventParticipant,
  EventStatus,
  EventType,
  NarrativeEvent,
  RelationshipChange,
} from "../types.js";

interface EventRow {
  id: string;
  title: string;
  description: string;
  type: EventType;
  status: EventStatus;
  relationship_changes: string;
  created_at: string;
  updated_at: string;
}

interface ParticipantRow {
  event_id: string;
  celebrity_id: string;
  role: string;
  name: string;
  handle: string;
}

function loadParticipants(eventId: string): EventParticipant[] {
  const rows = getDb()
    .prepare(
      `SELECT ep.*, c.name, c.handle FROM event_participants ep
       JOIN celebrities c ON c.id = ep.celebrity_id
       WHERE ep.event_id = ?`
    )
    .all(eventId) as ParticipantRow[];
  return rows.map((r) => ({
    celebrityId: r.celebrity_id,
    role: r.role,
    name: r.name,
    handle: r.handle,
  }));
}

function rowToEvent(row: EventRow): NarrativeEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    status: row.status,
    relationshipChanges: JSON.parse(row.relationship_changes) as RelationshipChange[],
    participants: loadParticipants(row.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createEvent(data: {
  title: string;
  description: string;
  type: EventType;
  relationshipChanges: RelationshipChange[];
  participants: { celebrityId: string; role: string }[];
}): NarrativeEvent {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  const insert = db.transaction(() => {
    db.prepare(
      `INSERT INTO events (id, title, description, type, status, relationship_changes, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'proposed', ?, ?, ?)`
    ).run(id, data.title, data.description, data.type, JSON.stringify(data.relationshipChanges), now, now);

    const insertParticipant = db.prepare(
      "INSERT INTO event_participants (event_id, celebrity_id, role) VALUES (?, ?, ?)"
    );
    for (const p of data.participants) {
      insertParticipant.run(id, p.celebrityId, p.role);
    }
  });
  insert();

  return getEventById(id)!;
}

export function getEventById(id: string): NarrativeEvent | undefined {
  const row = getDb().prepare("SELECT * FROM events WHERE id = ?").get(id) as EventRow | undefined;
  return row ? rowToEvent(row) : undefined;
}

export function listEvents(status?: EventStatus): NarrativeEvent[] {
  const db = getDb();
  const rows = (
    status
      ? db.prepare("SELECT * FROM events WHERE status = ? ORDER BY created_at DESC").all(status)
      : db.prepare("SELECT * FROM events ORDER BY created_at DESC").all()
  ) as EventRow[];
  return rows.map(rowToEvent);
}

export function setEventStatus(id: string, status: EventStatus): NarrativeEvent | undefined {
  const now = new Date().toISOString();
  const result = getDb()
    .prepare("UPDATE events SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, now, id);
  if (result.changes === 0) return undefined;
  return getEventById(id);
}

/** Active events a celebrity is involved in, for generation context. */
export function activeEventsFor(celebrityId: string): NarrativeEvent[] {
  const rows = getDb()
    .prepare(
      `SELECT e.* FROM events e
       JOIN event_participants ep ON ep.event_id = e.id
       WHERE ep.celebrity_id = ? AND e.status = 'active'
       ORDER BY e.created_at DESC`
    )
    .all(celebrityId) as EventRow[];
  return rows.map(rowToEvent);
}
