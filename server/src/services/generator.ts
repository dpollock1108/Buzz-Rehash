import type { Celebrity, GenerationRequest } from "../types.js";
import { generateJson } from "./claude.js";

type GeneratedCelebrity = Omit<Celebrity, "id" | "status" | "createdAt" | "updatedAt">;

const SYSTEM_PROMPT = `You are a creative director for a fictional social media universe called "Buzz Rehash." Your job is to generate completely fictional celebrity profiles that feel vivid, memorable, and entertaining.

Each celebrity should feel like a real person with a distinct online presence. No exact analogues to any public figures.

Key guidelines:
- Handles should feel authentic to the platform (use @prefix)
- The "writingVoice" field is CRITICAL: describe exactly HOW this person types their posts. Do they use all caps? Excessive ellipses? Gen-Z slang? Are they overly formal? Emoji-heavy? Do they misspell things on purpose? Do they type in fragments or long run-on sentences? Be very specific — this will be used to generate their posts later.
- Personalities should have clear quirks, contradictions, and depth; they can also be incredibly basic - many celebrities are.
- Backstories should be entertaining — these are internet celebrities after all
- Each celebrity should feel like they could generate engaging, drama-filled content
- Do NOT invent relationships with other celebrities — relationships are managed separately once the ecosystem has multiple approved celebrities`;

const CELEBRITY_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "Full name" },
    handle: { type: "string", description: "Social media handle with @ prefix" },
    bio: { type: "string", description: "2-3 sentence social media bio" },
    personality: {
      type: "string",
      description:
        "Paragraph describing their temperament, quirks, contradictions, what makes them tick",
    },
    writingVoice: {
      type: "string",
      description:
        "Detailed description of how they write posts: tone, slang, emoji usage, formatting habits, punctuation quirks, sentence structure, verbal tics",
    },
    backstory: {
      type: "string",
      description: "2-3 paragraph origin story of how they became famous",
    },
    attributes: {
      type: "object",
      properties: {
        age: { type: "integer" },
        genres: {
          type: "array",
          items: { type: "string" },
          description: "Content niches, e.g. 'fitness', 'lifestyle', 'drama'",
        },
      },
      required: ["age", "genres"],
      additionalProperties: false,
    },
  },
  required: ["name", "handle", "bio", "personality", "writingVoice", "backstory", "attributes"],
  additionalProperties: false,
};

export async function generateCelebrity(request?: GenerationRequest): Promise<GeneratedCelebrity> {
  let userMessage = "Generate a fictional celebrity profile for the Buzz Rehash universe.";

  if (request?.genres?.length) {
    userMessage += ` Their genres/niches should include: ${request.genres.join(", ")}.`;
  }
  if (request?.vibeKeywords?.length) {
    userMessage += ` Vibe keywords to inspire the character: ${request.vibeKeywords.join(", ")}.`;
  }

  userMessage += "\n\nMake them unique, memorable, and full of drama potential.";

  return generateJson<GeneratedCelebrity>({
    system: SYSTEM_PROMPT,
    user: userMessage,
    schema: CELEBRITY_SCHEMA,
  });
}
