import { describe, it, expect } from "vitest";
import {
  LOCK_HOUR,
  MAX_ACTIVE_PUSHES,
  METRICS_WINDOW_DAYS,
  ACTION_DISTRIBUTION_DAYS,
  TODO_FUTURE_THRESHOLD_DAYS,
  REFLECTION_ESCAPE_HATCH_LENGTH,
  DEFAULT_TODO_PRIORITY,
  FEATURED_ACTIONS_PER_GROUP,
  AGENT_LOOKBACK_DAYS,
  AGENT_ACTION_LIMIT,
  AGENT_SUMMARY_LIMIT,
  LLM_MAX_TOKENS,
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_OPENAI_MODEL,
  ANTHROPIC_API_VERSION,
  SCORING_NEEDLE_EXPONENT,
  SCORING_RECENCY_EXPONENT,
  SCORING_RECENCY_FLOOR,
} from "../constants";

describe("constants", () => {
  it("exports all expected constants with correct values", () => {
    expect(LOCK_HOUR).toBe(22);
    expect(MAX_ACTIVE_PUSHES).toBe(5);
    expect(METRICS_WINDOW_DAYS).toBe(90);
    expect(ACTION_DISTRIBUTION_DAYS).toBe(21);
    expect(TODO_FUTURE_THRESHOLD_DAYS).toBe(4);
    expect(REFLECTION_ESCAPE_HATCH_LENGTH).toBe(50);
    expect(DEFAULT_TODO_PRIORITY).toBe(5);
    expect(FEATURED_ACTIONS_PER_GROUP).toBe(2);
    expect(AGENT_LOOKBACK_DAYS).toBe(7);
    expect(AGENT_ACTION_LIMIT).toBe(35);
    expect(AGENT_SUMMARY_LIMIT).toBe(4);
    expect(LLM_MAX_TOKENS).toBe(2048);
    expect(DEFAULT_CLAUDE_MODEL).toBe("claude-sonnet-4-20250514");
    expect(DEFAULT_OPENAI_MODEL).toBe("gpt-4o");
    expect(ANTHROPIC_API_VERSION).toBe("2023-06-01");
    expect(SCORING_NEEDLE_EXPONENT).toBe(0.3);
    expect(SCORING_RECENCY_EXPONENT).toBe(0.7);
    expect(SCORING_RECENCY_FLOOR).toBe(0.01);
  });

  it("constants are the expected types", () => {
    expect(typeof LOCK_HOUR).toBe("number");
    expect(typeof MAX_ACTIVE_PUSHES).toBe("number");
  });
});
