import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-4-8";

let _client: Anthropic | null = null;
export function getClient(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

/**
 * Run a generation request constrained to a JSON schema (structured outputs)
 * and return the parsed result.
 */
export async function generateJson<T>(options: {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<T> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: options.maxTokens ?? 8192,
    thinking: { type: "adaptive" },
    system: options.system,
    messages: [{ role: "user", content: options.user }],
    output_config: {
      format: { type: "json_schema", schema: options.schema },
    },
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }
  return JSON.parse(textBlock.text) as T;
}
