import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parse } from "yaml";

// ============================================================
// Types
// ============================================================

export interface ModelConfig {
  provider?: "claude" | "openai";
  claude_model?: string;
  openai_model?: string;
  max_tokens?: number;
  temperature?: number;
}

interface RetryConfig {
  parse_retries: number;
  retry_suffix: string;
}

interface EventConfig {
  requires_approval: boolean;
}

interface DefaultsConfig {
  model: ModelConfig;
  retry: RetryConfig;
  event: EventConfig;
}

export interface AgentConfig {
  name: string;
  description: string;
  model: ModelConfig;
  retry: RetryConfig;
  event: EventConfig;
  system_prompt: string;
  context: Record<string, unknown>;
  output: Record<string, unknown>;
  behavior: Record<string, unknown>;
}

// ============================================================
// Loader
//
// Each agent lives in its own folder:
//   src/lib/agents/{agent-name}/
//     config.yaml        — name, description, model overrides
//     system-prompt.md   — the full system prompt
//     behavior.yaml      — agent-specific rules and thresholds
//     output.yaml        — expected response format
//     context.yaml       — what data the agent receives
// ============================================================

const AGENTS_DIR = join(process.cwd(), "src", "lib", "agents");

let defaultsCache: DefaultsConfig | null = null;

function loadDefaults(): DefaultsConfig {
  if (defaultsCache) return defaultsCache;
  const raw = readFileSync(join(AGENTS_DIR, "defaults.yaml"), "utf-8");
  defaultsCache = parse(raw) as DefaultsConfig;
  return defaultsCache;
}

function readYaml(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {};
  return (parse(readFileSync(path, "utf-8")) as Record<string, unknown>) ?? {};
}

function readText(path: string): string {
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf-8").trim();
}

export function loadAgentConfig(agentName: string): AgentConfig {
  const defaults = loadDefaults();
  const dir = join(AGENTS_DIR, agentName);

  const config = readYaml(join(dir, "config.yaml"));
  const behavior = readYaml(join(dir, "behavior.yaml"));
  const output = readYaml(join(dir, "output.yaml"));
  const context = readYaml(join(dir, "context.yaml"));
  const systemPrompt = readText(join(dir, "system-prompt.md"));

  return {
    name: (config.name as string) ?? agentName,
    description: (config.description as string) ?? "",
    model: { ...defaults.model, ...(config.model as ModelConfig | undefined) },
    retry: { ...defaults.retry, ...(config.retry as Partial<RetryConfig> | undefined) },
    event: { ...defaults.event, ...(config.event as Partial<EventConfig> | undefined) },
    system_prompt: systemPrompt,
    context,
    output,
    behavior,
  };
}
