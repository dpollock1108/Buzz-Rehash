import Anthropic from "@anthropic-ai/sdk";
import type { Celebrity, GenerationRequest } from "../types.js";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

type GeneratedCelebrity = Omit<Celebrity, "id" | "status" | "createdAt" | "updatedAt">;

const SYSTEM_PROMPT = `You are a creative director for a fictional social media universe called "Buzz Rehash." Your job is to generate completely fictional celebrity profiles that feel vivid, memorable, and entertaining.

Each celebrity should feel like a real person with a distinct online presence. No exact analogues to any public figures.

Key guidelines:
- Handles should feel authentic to the platform (use @prefix)
- The "writingVoice" field is CRITICAL: describe exactly HOW this person types their posts. Do they use all caps? Excessive ellipses? Gen-Z slang? Are they overly formal? Emoji-heavy? Do they misspell things on purpose? Do they type in fragments or long run-on sentences? Be very specific — this will be used to generate their posts later.
- Personalities should have clear quirks, contradictions, and depth; they can also be incredibly basic - many celebrities are.
- Backstories should be entertaining — these are internet celebrities after all
- Each celebrity should feel like they could generate engaging, drama-filled content
- Do NOT invent relationships with other celebrities — relationships are managed separately once the ecosystem has multiple approved celebrities

Respond with ONLY valid JSON (no markdown fences, no explanation) matching this exact schema:
{
  "name": "string - full name",
  "handle": "string - social media handle with @ prefix",
  "bio": "string - 2-3 sentence social media bio",
  "personality": "string - paragraph describing their temperament, quirks, contradictions, what makes them tick",
  "writingVoice": "string - detailed description of how they write posts: tone, slang, emoji usage, formatting habits, punctuation quirks, sentence structure, verbal tics",
  "backstory": "string - 2-3 paragraph origin story of how they became famous",
  "attributes": {
    "age": "number",
    "genres": ["array of strings - their content niches, can be multiple (e.g. 'fitness', 'lifestyle', 'drama')"]
  }
}`;

export async function generateCelebrity(request?: GenerationRequest): Promise<GeneratedCelebrity> {
  let userMessage = "Generate a fictional celebrity profile for the Buzz Rehash universe.";

  if (request?.genres?.length) {
    userMessage += ` Their genres/niches should include: ${request.genres.join(", ")}.`;
  }
  if (request?.vibeKeywords?.length) {
    userMessage += ` Vibe keywords to inspire the character: ${request.vibeKeywords.join(", ")}.`;
  }

  userMessage += "\n\nMake them unique, memorable, and full of drama potential. Respond with ONLY the JSON object.";

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  let jsonText = textBlock.text.trim();
  // Strip markdown code fences if present
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonText) as GeneratedCelebrity;

  // Basic validation
  const required = ["name", "handle", "bio", "personality", "writingVoice", "backstory"] as const;
  for (const field of required) {
    if (!parsed[field] || typeof parsed[field] !== "string") {
      throw new Error(`Generated celebrity missing required field: ${field}`);
    }
  }

  if (!parsed.attributes || typeof parsed.attributes !== "object") {
    parsed.attributes = {};
  }

  return parsed;
}
