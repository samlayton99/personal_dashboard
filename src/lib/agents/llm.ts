import type { ModelConfig } from "./loader";
import { LLM_MAX_TOKENS, DEFAULT_CLAUDE_MODEL, DEFAULT_OPENAI_MODEL, ANTHROPIC_API_VERSION } from "@/lib/constants";

type LLMProvider = "claude" | "openai";

function getProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER ?? "claude";
  if (provider !== "claude" && provider !== "openai") {
    throw new Error(`Invalid LLM_PROVIDER: ${provider}. Must be "claude" or "openai".`);
  }
  return provider;
}

export async function callLLM(
  system: string,
  user: string,
  model?: ModelConfig
): Promise<string> {
  const provider = model?.provider ?? getProvider();

  if (provider === "claude") {
    return callClaude(system, user, {
      model: model?.claude_model ?? DEFAULT_CLAUDE_MODEL,
      max_tokens: model?.max_tokens ?? LLM_MAX_TOKENS,
    });
  }
  return callOpenAI(system, user, {
    model: model?.openai_model ?? DEFAULT_OPENAI_MODEL,
    max_tokens: model?.max_tokens ?? LLM_MAX_TOKENS,
  });
}

async function callClaude(
  system: string,
  user: string,
  opts: { model: string; max_tokens: number }
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_API_VERSION,
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.max_tokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API error (${res.status}): ${body}`);
  }

  const data = await res.json();
  const textBlock = data.content?.find(
    (block: { type: string }) => block.type === "text"
  );
  if (!textBlock) throw new Error("No text content in Claude response");
  return textBlock.text;
}

async function callOpenAI(
  system: string,
  user: string,
  opts: { model: string; max_tokens: number }
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.max_tokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${body}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No text content in OpenAI response");
  return content;
}
