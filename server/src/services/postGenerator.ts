import type { Celebrity, FeedPost, NarrativeEvent, PostGenerationRequest } from "../types.js";
import { getById } from "./celebrity.js";
import { generateJson } from "./claude.js";
import { activeEventsFor, getEventById } from "./event.js";
import { getMemoriesForContext } from "./memory.js";
import { createPost, recentPostContents } from "./post.js";
import { listRelationships } from "./relationship.js";

const SYSTEM_PROMPT = `You are the voice engine for "Buzz Rehash," a fictional social media universe. You write social media posts AS a specific fictional celebrity, perfectly in their voice.

Rules:
- The post must sound exactly like the celebrity's described writing voice — punctuation quirks, slang, emoji habits, capitalization, everything.
- Posts are short-form social media posts: usually 1-4 sentences, occasionally longer rants if that fits the persona.
- Stay consistent with the celebrity's memories and relationships. Reference past events naturally when relevant, the way a real person vaguely alludes to their own drama.
- Never break character. Never mention being an AI or that this is fictional.
- Do not repeat topics or phrasing from the celebrity's recent posts.`;

const POST_SCHEMA = {
  type: "object",
  properties: {
    content: {
      type: "string",
      description: "The post text, written exactly in the celebrity's voice",
    },
  },
  required: ["content"],
  additionalProperties: false,
};

function celebrityBlock(celebrity: Celebrity): string {
  return `## Who you are
Name: ${celebrity.name} (${celebrity.handle})
Bio: ${celebrity.bio}
Personality: ${celebrity.personality}
Writing voice (follow this precisely): ${celebrity.writingVoice}`;
}

export function buildPostContext(celebrity: Celebrity, event?: NarrativeEvent): string {
  const sections: string[] = [celebrityBlock(celebrity)];

  const relationships = listRelationships(celebrity.id);
  if (relationships.length) {
    const lines = relationships.map((r) => {
      const other =
        r.celebrityAId === celebrity.id
          ? `${r.celebrityBName} (${r.celebrityBHandle})`
          : `${r.celebrityAName} (${r.celebrityAHandle})`;
      return `- ${other}: ${r.type}${r.description ? ` — ${r.description}` : ""}`;
    });
    sections.push(`## Your relationships\n${lines.join("\n")}`);
  }

  const memories = getMemoriesForContext(celebrity.id);
  if (memories.length) {
    sections.push(
      `## Things you remember\n${memories.map((m) => `- ${m.content}`).join("\n")}`
    );
  }

  const activeEvents = event ? [] : activeEventsFor(celebrity.id);
  if (activeEvents.length) {
    sections.push(
      `## What's currently going on in your life\n${activeEvents
        .map((e) => `- ${e.title}: ${e.description}`)
        .join("\n")}`
    );
  }

  const recent = recentPostContents(celebrity.id);
  if (recent.length) {
    sections.push(
      `## Your recent posts (do NOT repeat these topics or phrasings)\n${recent
        .map((c) => `- "${c}"`)
        .join("\n")}`
    );
  }

  return sections.join("\n\n");
}

export async function generatePost(request: PostGenerationRequest): Promise<FeedPost> {
  const celebrity = getById(request.celebrityId);
  if (!celebrity) throw new Error("Celebrity not found");
  if (celebrity.status !== "approved") throw new Error("Celebrity is not approved");

  const event = request.eventId ? getEventById(request.eventId) : undefined;
  if (request.eventId && !event) throw new Error("Event not found");

  let instruction: string;
  if (event) {
    const role = event.participants.find((p) => p.celebrityId === celebrity.id)?.role;
    instruction = `Something just happened and you're reacting to it publicly.

## The event
${event.title} (${event.type})
${event.description}
Your role in it: ${role ?? "involved"}

Write a post reacting to this event from your perspective, in your voice. React the way YOUR persona would — that might be dramatic, coy, passive-aggressive, oblivious, or performatively unbothered.`;
  } else if (request.topic) {
    instruction = `Write a post about: ${request.topic}`;
  } else {
    instruction =
      "Write a slice-of-life post — whatever this celebrity would post today. It can be mundane, promotional, chaotic, or attention-seeking, as fits the persona.";
  }

  const { content } = await generateJson<{ content: string }>({
    system: SYSTEM_PROMPT,
    user: `${buildPostContext(celebrity, event)}\n\n## Your task\n${instruction}`,
    schema: POST_SCHEMA,
    maxTokens: 4096,
  });

  return createPost({
    celebrityId: celebrity.id,
    content,
    eventId: event?.id,
  });
}
