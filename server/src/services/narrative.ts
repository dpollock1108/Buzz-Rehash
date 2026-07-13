import type {
  EventGenerationRequest,
  EventStatus,
  FeedPost,
  NarrativeEvent,
  RelationshipChange,
  RelationshipType,
} from "../types.js";
import { EVENT_TYPES, RELATIONSHIP_TYPES } from "../types.js";
import { listByStatus } from "./celebrity.js";
import { generateJson } from "./claude.js";
import { createEvent, getEventById, listEvents, setEventStatus } from "./event.js";
import { addMemory } from "./memory.js";
import { generatePost } from "./postGenerator.js";
import { listRelationships, removeBetween, upsertBetween } from "./relationship.js";

const SYSTEM_PROMPT = `You are the narrative engine for "Buzz Rehash," a fictional social media universe populated by fictional celebrities. Your job is to invent the next event in the ongoing storyline — the drama, romances, feuds, collabs, scandals, and mishaps that give the celebrities something to react to.

Guidelines:
- Events should feel like real internet celebrity drama: petty, messy, funny, or heartwarming.
- Build on existing relationships and past events when possible — continuity makes the universe feel alive. An escalating feud is better than a random one.
- Only involve celebrities from the provided cast list, referenced by their handle.
- 2-3 participants is the sweet spot; solo events (a mishap, an announcement) are fine too.
- Assign each participant a role describing their part in the event (e.g. "instigator", "target", "love interest", "caught in the crossfire").
- If the event should change relationships (new couple, breakup, new feud, reconciliation), include those changes. Otherwise leave the list empty.
- The description is internal lore, not a post: state plainly what happened, where, and why it matters.`;

interface GeneratedEvent {
  title: string;
  description: string;
  type: string;
  participants: { handle: string; role: string }[];
  relationshipChanges: {
    handleA: string;
    handleB: string;
    action: "set" | "remove";
    type: string;
    description: string;
  }[];
}

const EVENT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Short headline for the event" },
    description: {
      type: "string",
      description: "1-2 paragraph internal account of what happened",
    },
    type: { type: "string", enum: EVENT_TYPES },
    participants: {
      type: "array",
      items: {
        type: "object",
        properties: {
          handle: { type: "string", description: "The celebrity's @handle from the cast list" },
          role: { type: "string", description: "Their part in the event" },
        },
        required: ["handle", "role"],
        additionalProperties: false,
      },
    },
    relationshipChanges: {
      type: "array",
      description: "Relationship mutations this event causes; empty if none",
      items: {
        type: "object",
        properties: {
          handleA: { type: "string" },
          handleB: { type: "string" },
          action: { type: "string", enum: ["set", "remove"] },
          type: {
            type: "string",
            enum: [...RELATIONSHIP_TYPES],
            description: "New relationship type (ignored for remove)",
          },
          description: { type: "string", description: "One-line context for the relationship" },
        },
        required: ["handleA", "handleB", "action", "type", "description"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "description", "type", "participants", "relationshipChanges"],
  additionalProperties: false,
};

export async function generateEvent(request?: EventGenerationRequest): Promise<NarrativeEvent> {
  const approved = listByStatus("approved");
  if (approved.length === 0) {
    throw new Error("No approved celebrities in the ecosystem yet");
  }

  const cast = approved
    .map(
      (c) =>
        `- ${c.name} (${c.handle}) — ${c.bio} Personality: ${c.personality.slice(0, 200)}`
    )
    .join("\n");

  const relationships = listRelationships()
    .map(
      (r) =>
        `- ${r.celebrityAHandle} & ${r.celebrityBHandle}: ${r.type}${r.description ? ` — ${r.description}` : ""}`
    )
    .join("\n");

  const recentEvents = listEvents()
    .filter((e) => e.status !== "denied")
    .slice(0, 8)
    .map((e) => `- [${e.status}] ${e.title} (${e.type}): ${e.description.slice(0, 150)}`)
    .join("\n");

  const sections = [
    `## The cast\n${cast}`,
    relationships ? `## Current relationships\n${relationships}` : "",
    recentEvents ? `## Recent storyline (build on this where it makes sense)\n${recentEvents}` : "",
  ].filter(Boolean);

  let instruction = "Invent the next event in the Buzz Rehash storyline.";
  if (request?.type) instruction += ` The event type must be: ${request.type}.`;
  if (request?.celebrityIds?.length) {
    const wanted = approved.filter((c) => request.celebrityIds!.includes(c.id));
    if (wanted.length) {
      instruction += ` It must involve: ${wanted.map((c) => c.handle).join(", ")}.`;
    }
  }
  if (request?.prompt) instruction += ` Creative direction from the showrunner: ${request.prompt}`;

  const generated = await generateJson<GeneratedEvent>({
    system: SYSTEM_PROMPT,
    user: `${sections.join("\n\n")}\n\n## Your task\n${instruction}`,
    schema: EVENT_SCHEMA,
  });

  // Tolerate the model dropping/adding the @ prefix or changing case
  const normalize = (handle: string) => handle.trim().replace(/^@/, "").toLowerCase();
  const byHandle = new Map(approved.map((c) => [normalize(c.handle), c]));
  const resolve = (handle: string) => byHandle.get(normalize(handle));

  const participants = generated.participants
    .map((p) => {
      const celeb = resolve(p.handle);
      return celeb ? { celebrityId: celeb.id, role: p.role } : null;
    })
    .filter((p): p is { celebrityId: string; role: string } => p !== null);

  if (participants.length === 0) {
    throw new Error("Generated event referenced no known celebrities");
  }

  const relationshipChanges: RelationshipChange[] = generated.relationshipChanges
    .map((rc): RelationshipChange | null => {
      const a = resolve(rc.handleA);
      const b = resolve(rc.handleB);
      if (!a || !b || a.id === b.id) return null;
      return {
        celebrityAId: a.id,
        celebrityBId: b.id,
        action: rc.action,
        type: rc.type as RelationshipType,
        description: rc.description,
      };
    })
    .filter((rc): rc is RelationshipChange => rc !== null);

  const type = EVENT_TYPES.includes(generated.type as (typeof EVENT_TYPES)[number])
    ? (generated.type as (typeof EVENT_TYPES)[number])
    : "mishap";

  return createEvent({
    title: generated.title,
    description: generated.description,
    type,
    relationshipChanges,
    participants,
  });
}

/**
 * Transition an event's status. Approving (proposed -> active) applies the
 * event's relationship changes and writes a memory for each participant.
 */
export function transitionEvent(id: string, status: EventStatus): NarrativeEvent | undefined {
  const event = getEventById(id);
  if (!event) return undefined;

  if (status === "active" && event.status === "proposed") {
    for (const change of event.relationshipChanges) {
      if (change.action === "remove") {
        removeBetween(change.celebrityAId, change.celebrityBId);
      } else if (change.type) {
        upsertBetween({
          celebrityAId: change.celebrityAId,
          celebrityBId: change.celebrityBId,
          type: change.type,
          description: change.description,
        });
      }
    }
    for (const participant of event.participants) {
      addMemory({
        celebrityId: participant.celebrityId,
        content: `${event.title}: ${event.description} (your role: ${participant.role})`,
        sourceType: "event",
        sourceId: event.id,
        importance: 7,
      });
    }
  }

  return setEventStatus(id, status);
}

/** Generate a reaction post from each participant of an active event. */
export async function generateReactions(eventId: string): Promise<FeedPost[]> {
  const event = getEventById(eventId);
  if (!event) throw new Error("Event not found");
  if (event.status !== "active") throw new Error("Event must be active to generate reactions");

  const posts: FeedPost[] = [];
  for (const participant of event.participants) {
    try {
      posts.push(await generatePost({ celebrityId: participant.celebrityId, eventId }));
    } catch (error) {
      // One celebrity failing (e.g. no longer approved) shouldn't sink the rest
      console.error(`Reaction failed for ${participant.handle}:`, error);
    }
  }
  return posts;
}
