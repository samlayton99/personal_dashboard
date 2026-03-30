// Time & scheduling
export const LOCK_HOUR = 22; // 10 PM — when nightly reflection lock triggers

// Limits
export const MAX_ACTIVE_PUSHES = 5;
export const METRICS_WINDOW_DAYS = 90;
export const ACTION_DISTRIBUTION_DAYS = 21;
export const TODO_FUTURE_THRESHOLD_DAYS = 4;
export const REFLECTION_ESCAPE_HATCH_LENGTH = 50;
export const DEFAULT_TODO_PRIORITY = 5;
export const FEATURED_ACTIONS_PER_GROUP = 2;

// Agent config
export const AGENT_LOOKBACK_DAYS = 7;
export const AGENT_ACTION_LIMIT = 35;
export const AGENT_SUMMARY_LIMIT = 4;

// LLM
export const LLM_MAX_TOKENS = 2048;
export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";
export const DEFAULT_OPENAI_MODEL = "gpt-4o";
export const ANTHROPIC_API_VERSION = "2023-06-01";

// Scoring algorithm
export const SCORING_NEEDLE_EXPONENT = 0.3;
export const SCORING_RECENCY_EXPONENT = 0.7;
export const SCORING_RECENCY_FLOOR = 0.01;
