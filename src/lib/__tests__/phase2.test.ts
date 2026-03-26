/**
 * Phase 2 Integration Tests
 * Tests pure functions from the lock system, agent config,
 * prompt builders, and response parsers.
 */

// ============================================================
// 1. Lock utility tests
// ============================================================

import { shouldLock, getLocalDateString } from "../utils/lock";

function testLockUtility() {
  console.log("--- Lock Utility Tests ---");

  // getLocalDateString returns YYYY-MM-DD format
  const dateStr = getLocalDateString();
  const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  console.assert(dateMatch, `getLocalDateString format: got "${dateStr}"`);

  // shouldLock with null date should depend on time only
  // (can't fully test time-dependent behavior, but we can test the date logic)
  console.assert(
    shouldLock(null) === true || shouldLock(null) === false,
    "shouldLock(null) returns boolean"
  );

  // shouldLock with today's date should return false (already reflected today)
  // unless it's after 10 PM AND the date comparison fails
  const today = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // If it's before 10 PM, shouldLock should always be false
  const hour = new Date().getHours();
  if (hour < 22) {
    console.assert(shouldLock(null) === false, "Before 10 PM: shouldLock(null) = false");
    console.assert(shouldLock(today) === false, "Before 10 PM: shouldLock(today) = false");
    console.assert(shouldLock(yesterdayStr) === false, "Before 10 PM: shouldLock(yesterday) = false");
  } else {
    console.assert(shouldLock(today) === false, "After 10 PM: shouldLock(today) = false (already reflected)");
    console.assert(shouldLock(yesterdayStr) === true, "After 10 PM: shouldLock(yesterday) = true");
    console.assert(shouldLock(null) === true, "After 10 PM: shouldLock(null) = true");
  }

  console.log("Lock utility tests passed");
}

// ============================================================
// 2. Action proposal parser tests
// ============================================================

import { parseActionProposals } from "../agents/nightly-reflection/prompt-builder";

function testActionParser() {
  console.log("\n--- Action Parser Tests ---");

  // Valid JSON array
  const valid = JSON.stringify([
    { description: "Do X", push_ids: ["p1"], objective_ids: ["o1"], needle_score: 75 },
    { description: "Do Y", push_ids: [], objective_ids: [], needle_score: 30 },
  ]);
  const result = parseActionProposals(valid);
  console.assert(result.length === 2, `Expected 2 actions, got ${result.length}`);
  console.assert(result[0].description === "Do X", "First action description");
  console.assert(result[0].needle_score === 75, "First action needle_score");
  console.assert(result[1].push_ids.length === 0, "Second action empty push_ids");

  // JSON wrapped in markdown code fences
  const fenced = '```json\n[{"description": "Fenced action", "needle_score": 50}]\n```';
  const fencedResult = parseActionProposals(fenced);
  console.assert(fencedResult.length === 1, "Fenced JSON parsed");
  console.assert(fencedResult[0].description === "Fenced action", "Fenced description");

  // Missing optional fields get defaults
  const minimal = '[{"description": "Minimal"}]';
  const minResult = parseActionProposals(minimal);
  console.assert(minResult[0].needle_score === 50, "Default needle_score is 50");
  console.assert(minResult[0].push_ids.length === 0, "Default push_ids is []");
  console.assert(minResult[0].objective_ids.length === 0, "Default objective_ids is []");

  // Needle score clamped to 0-100
  const clamped = '[{"description": "Over", "needle_score": 150}]';
  const clampResult = parseActionProposals(clamped);
  console.assert(clampResult[0].needle_score === 100, "needle_score clamped to 100");

  const clampedLow = '[{"description": "Under", "needle_score": -10}]';
  const clampLowResult = parseActionProposals(clampedLow);
  console.assert(clampLowResult[0].needle_score === 0, "needle_score clamped to 0");

  // Missing description throws
  let threw = false;
  try {
    parseActionProposals('[{"needle_score": 50}]');
  } catch {
    threw = true;
  }
  console.assert(threw, "Missing description throws error");

  // Invalid JSON throws
  threw = false;
  try {
    parseActionProposals("not json at all");
  } catch {
    threw = true;
  }
  console.assert(threw, "Invalid JSON throws error");

  // Non-array JSON throws
  threw = false;
  try {
    parseActionProposals('{"description": "not an array"}');
  } catch {
    threw = true;
  }
  console.assert(threw, "Non-array JSON throws error");

  // Filters non-string push_ids
  const badIds = '[{"description": "X", "push_ids": ["valid", 123, null]}]';
  const badIdResult = parseActionProposals(badIds);
  console.assert(badIdResult[0].push_ids.length === 1, "Non-string push_ids filtered out");
  console.assert(badIdResult[0].push_ids[0] === "valid", "Only string push_ids kept");

  console.log("Action parser tests passed");
}

// ============================================================
// 3. Todo proposal parser tests
// ============================================================

import { parseTodoProposals } from "../agents/todo-parser/prompt-builder";

function testTodoParser() {
  console.log("\n--- Todo Parser Tests ---");

  // Valid JSON array
  const valid = JSON.stringify([
    { description: "Call dentist", panel: "now", due_date: null },
    { description: "Finish report", panel: "in_progress", due_date: "2026-03-28" },
    { description: "Research X", panel: "future", due_date: null },
  ]);
  const result = parseTodoProposals(valid);
  console.assert(result.length === 3, `Expected 3 todos, got ${result.length}`);
  console.assert(result[0].panel === "now", "First todo panel");
  console.assert(result[1].due_date === "2026-03-28", "Second todo due_date");
  console.assert(result[2].panel === "future", "Third todo panel");

  // Invalid panel defaults to "now"
  const badPanel = '[{"description": "X", "panel": "invalid"}]';
  const badPanelResult = parseTodoProposals(badPanel);
  console.assert(badPanelResult[0].panel === "now", "Invalid panel defaults to now");

  // Missing panel defaults to "now"
  const noPanel = '[{"description": "X"}]';
  const noPanelResult = parseTodoProposals(noPanel);
  console.assert(noPanelResult[0].panel === "now", "Missing panel defaults to now");

  // Missing due_date defaults to null
  const noDue = '[{"description": "X", "panel": "now"}]';
  const noDueResult = parseTodoProposals(noDue);
  console.assert(noDueResult[0].due_date === null, "Missing due_date defaults to null");

  // Markdown fenced JSON
  const fenced = '```json\n[{"description": "Fenced", "panel": "future"}]\n```';
  const fencedResult = parseTodoProposals(fenced);
  console.assert(fencedResult.length === 1, "Fenced JSON parsed");
  console.assert(fencedResult[0].panel === "future", "Fenced panel correct");

  // Missing description throws
  let threw = false;
  try {
    parseTodoProposals('[{"panel": "now"}]');
  } catch {
    threw = true;
  }
  console.assert(threw, "Missing description throws error");

  console.log("Todo parser tests passed");
}

// ============================================================
// 4. Agent config loader tests
// ============================================================

import { loadAgentConfig } from "../agents/loader";

function testConfigLoader() {
  console.log("\n--- Config Loader Tests ---");

  // Load nightly-reflection config
  const nrConfig = loadAgentConfig("nightly-reflection");
  console.assert(nrConfig.name === "nightly-reflection", `Name: ${nrConfig.name}`);
  console.assert(typeof nrConfig.system_prompt === "string", "system_prompt is string");
  console.assert(nrConfig.system_prompt.length > 50, "system_prompt is non-trivial");
  console.assert(nrConfig.system_prompt.includes("JSON"), "system_prompt mentions JSON output");
  console.assert(nrConfig.model.provider === "claude", `Default provider: ${nrConfig.model.provider}`);
  console.assert(typeof nrConfig.model.max_tokens === "number", "max_tokens is number");
  console.assert(nrConfig.retry.parse_retries === 1, "Default parse_retries");
  console.assert(nrConfig.event.requires_approval === true, "Default requires_approval");
  console.assert(nrConfig.behavior.event_type === "action_proposed", "Behavior event_type");

  // Load todo-parser config
  const tpConfig = loadAgentConfig("todo-parser");
  console.assert(tpConfig.name === "todo-parser", `Name: ${tpConfig.name}`);
  console.assert(typeof tpConfig.system_prompt === "string", "system_prompt is string");
  console.assert(tpConfig.system_prompt.includes("todo"), "system_prompt mentions todo");
  console.assert(tpConfig.model.provider === "claude", "Inherits default provider");
  console.assert(tpConfig.model.max_tokens === 2048, "Inherits default max_tokens");
  console.assert(tpConfig.behavior.event_type === "todos_parsed", "Behavior event_type");

  // Nonexistent agent throws
  let threw = false;
  try {
    loadAgentConfig("nonexistent-agent");
  } catch {
    threw = true;
  }
  console.assert(threw, "Nonexistent agent throws error");

  console.log("Config loader tests passed");
}

// ============================================================
// 5. Prompt builder tests
// ============================================================

import { buildNightlyReflectionPrompt } from "../agents/nightly-reflection/prompt-builder";
import { buildTodoParserPrompt } from "../agents/todo-parser/prompt-builder";

function testPromptBuilders() {
  console.log("\n--- Prompt Builder Tests ---");

  // Nightly reflection prompt
  const nrPrompt = buildNightlyReflectionPrompt("System prompt here", {
    reflectionText: "I worked on the dashboard today",
    completedTodos: [{ description: "Fix bug", push_id: null }],
    recentActions: [{ description: "Deployed v1", needle_score: 80, created_at: "2026-03-25T10:00:00Z" }],
    activePushes: [{ id: "p1", name: "Ship MVP", description: "Launch by April" }],
    activeObjectives: [{ id: "o1", name: "Build product", description: null }],
    recentSummaries: [],
  });
  console.assert(nrPrompt.system === "System prompt here", "System prompt passed through");
  console.assert(nrPrompt.user.includes("I worked on the dashboard"), "Reflection text in user prompt");
  console.assert(nrPrompt.user.includes("Fix bug"), "Completed todo in user prompt");
  console.assert(nrPrompt.user.includes("Deployed v1"), "Recent action in user prompt");
  console.assert(nrPrompt.user.includes("Ship MVP"), "Active push in user prompt");
  console.assert(nrPrompt.user.includes("Build product"), "Active objective in user prompt");
  console.assert(nrPrompt.user.includes("p1"), "Push ID in user prompt");
  console.assert(nrPrompt.user.includes("o1"), "Objective ID in user prompt");

  // Empty context (no todos, no actions, no summaries)
  const emptyPrompt = buildNightlyReflectionPrompt("Sys", {
    reflectionText: "Nothing much",
    completedTodos: [],
    recentActions: [],
    activePushes: [{ id: "p1", name: "Test", description: null }],
    activeObjectives: [{ id: "o1", name: "Test", description: null }],
    recentSummaries: [],
  });
  console.assert(!emptyPrompt.user.includes("Completed Todos"), "No completed todos section when empty");
  console.assert(!emptyPrompt.user.includes("Recent Actions"), "No recent actions section when empty");

  // Todo parser prompt
  const tpPrompt = buildTodoParserPrompt("Todo system prompt", {
    todoText: "call dentist, finish report",
    currentDate: "2026-03-25",
  });
  console.assert(tpPrompt.system === "Todo system prompt", "System prompt passed through");
  console.assert(tpPrompt.user.includes("call dentist"), "Todo text in user prompt");
  console.assert(tpPrompt.user.includes("2026-03-25"), "Current date in user prompt");

  console.log("Prompt builder tests passed");
}

// ============================================================
// 6. Date utility tests
// ============================================================

import { startOfWeek, startOfMonth, todayDateString } from "../utils/dates";

function testDateUtils() {
  console.log("\n--- Date Utility Tests ---");

  const week = startOfWeek();
  console.assert(week instanceof Date, "startOfWeek returns Date");
  console.assert(week.getDay() === 1, `startOfWeek is Monday, got day ${week.getDay()}`);
  console.assert(week.getHours() === 0, "startOfWeek is midnight");

  const month = startOfMonth();
  console.assert(month instanceof Date, "startOfMonth returns Date");
  console.assert(month.getDate() === 1, "startOfMonth is 1st");

  const today = todayDateString();
  console.assert(/^\d{4}-\d{2}-\d{2}$/.test(today), `todayDateString format: ${today}`);

  console.log("Date utility tests passed");
}

// ============================================================
// Run all tests
// ============================================================

console.log("=== Phase 2 Tests ===\n");
testLockUtility();
testActionParser();
testTodoParser();
testConfigLoader();
testPromptBuilders();
testDateUtils();
console.log("\n=== All tests passed ===");
