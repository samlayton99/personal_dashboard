# Codebase Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the dashboard codebase for readability, reduce duplication, and make patterns explicit for future agents.

**Architecture:** Extract shared patterns (constants, temp IDs, DnD sensors, optimistic operations) into reusable utilities and hooks. Standardize error handling. Remove dead code. Add vitest for testing new utilities.

**Tech Stack:** TypeScript, React hooks, vitest, Next.js 16

---

### Task 1: Add vitest test infrastructure

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add vitest devDependency and test script)

- [ ] **Step 1: Install vitest**

Run: `npm install -D vitest`

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify vitest works**

Run: `npx vitest run`
Expected: No tests found (0 passed), exits cleanly.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "add vitest test infrastructure"
```

---

### Task 2: Extract constants file

**Files:**
- Create: `src/lib/constants.ts`
- Create: `src/lib/__tests__/constants.test.ts`

- [ ] **Step 1: Write the test**

Create `src/lib/__tests__/constants.test.ts`:
```typescript
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

  it("constants are frozen (not accidentally mutable)", () => {
    expect(typeof LOCK_HOUR).toBe("number");
    expect(typeof MAX_ACTIVE_PUSHES).toBe("number");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/constants.test.ts`
Expected: FAIL - cannot find module "../constants"

- [ ] **Step 3: Write the constants file**

Create `src/lib/constants.ts`:
```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/constants.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/constants.ts src/lib/__tests__/constants.test.ts
git commit -m "extract magic numbers into constants module"
```

---

### Task 3: Wire constants into consuming files

**Files:**
- Modify: `src/lib/utils/lock.ts` — use `LOCK_HOUR`
- Modify: `src/lib/utils/scoring.ts` — use scoring constants
- Modify: `src/lib/agents/llm.ts` — use LLM constants
- Modify: `src/app/(dashboard)/first-principles/actions.ts` — use limit constants
- Modify: `src/app/(dashboard)/first-principles/page.tsx` — use window constants

- [ ] **Step 1: Update lock.ts**

In `src/lib/utils/lock.ts`, replace `const LOCK_HOUR = 22;` (line 1) with:
```typescript
import { LOCK_HOUR } from "@/lib/constants";
```

- [ ] **Step 2: Update scoring.ts**

Replace the entire file `src/lib/utils/scoring.ts` with:
```typescript
import {
  METRICS_WINDOW_DAYS,
  SCORING_NEEDLE_EXPONENT,
  SCORING_RECENCY_EXPONENT,
  SCORING_RECENCY_FLOOR,
} from "@/lib/constants";

export function computeFeaturedActionScore(needleScore: number, daysAgo: number): number {
  const x = needleScore / 100;
  return (
    Math.pow(x, SCORING_NEEDLE_EXPONENT) *
    Math.pow(Math.max(SCORING_RECENCY_FLOOR, 1 - daysAgo / METRICS_WINDOW_DAYS), SCORING_RECENCY_EXPONENT)
  );
}
```

- [ ] **Step 3: Update llm.ts**

In `src/lib/agents/llm.ts`:
- Add import at top: `import { LLM_MAX_TOKENS, DEFAULT_CLAUDE_MODEL, DEFAULT_OPENAI_MODEL, ANTHROPIC_API_VERSION } from "@/lib/constants";`
- Line 22: replace `"claude-sonnet-4-20250514"` with `DEFAULT_CLAUDE_MODEL`
- Line 23: replace `2048` with `LLM_MAX_TOKENS`
- Line 27: replace `"gpt-4o"` with `DEFAULT_OPENAI_MODEL`
- Line 28: replace `2048` with `LLM_MAX_TOKENS`
- Line 45: replace `"2023-06-01"` with `ANTHROPIC_API_VERSION`

- [ ] **Step 4: Update first-principles/actions.ts**

In `src/app/(dashboard)/first-principles/actions.ts`:
- Add import at top (after `"use server"`): `import { MAX_ACTIVE_PUSHES, TODO_FUTURE_THRESHOLD_DAYS, DEFAULT_TODO_PRIORITY, REFLECTION_ESCAPE_HATCH_LENGTH, METRICS_WINDOW_DAYS } from "@/lib/constants";`
- Line 151: replace `> 4` with `> TODO_FUTURE_THRESHOLD_DAYS`
- Line 167: replace `?? 5` with `?? DEFAULT_TODO_PRIORITY`
- Line 244: replace `>= 5` with `>= MAX_ACTIVE_PUSHES`
- Line 372: replace `< 50` with `< REFLECTION_ESCAPE_HATCH_LENGTH`
- Line 385: replace `< 50` with `< REFLECTION_ESCAPE_HATCH_LENGTH`
- Line 518: replace `- 90` with `- METRICS_WINDOW_DAYS`

- [ ] **Step 5: Update first-principles/page.tsx**

In `src/app/(dashboard)/first-principles/page.tsx`:
- Add import: `import { METRICS_WINDOW_DAYS, ACTION_DISTRIBUTION_DAYS, FEATURED_ACTIONS_PER_GROUP } from "@/lib/constants";`
- Line 14: replace `- 90` with `- METRICS_WINDOW_DAYS`
- Line 78 (twentyOneDaysAgo calc): replace `- 21` with `- ACTION_DISTRIBUTION_DAYS`
- Lines 168, 183 (`.slice(0, 2)`): replace `2` with `FEATURED_ACTIONS_PER_GROUP`

- [ ] **Step 6: Build check**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/utils/lock.ts src/lib/utils/scoring.ts src/lib/agents/llm.ts src/app/\(dashboard\)/first-principles/actions.ts src/app/\(dashboard\)/first-principles/page.tsx
git commit -m "wire constants into all consuming files"
```

---

### Task 4: Consolidate date utilities and remove dead code

**Files:**
- Modify: `src/lib/utils/dates.ts` — remove `todayDateString`, remove `isMoreThanNDaysOut`
- Modify: `src/lib/utils/lock.ts` — export `formatLocalDate`
- Create: `src/lib/__tests__/dates.test.ts`

- [ ] **Step 1: Check for usages of removed functions**

Run: `grep -r "todayDateString\|isMoreThanNDaysOut" src/ --include="*.ts" --include="*.tsx"`
Verify `todayDateString` is unused outside dates.ts and `isMoreThanNDaysOut` is unused.

- [ ] **Step 2: Write the test**

Create `src/lib/__tests__/dates.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { toLocalDate, toLocalDateTime, startOfWeek, startOfMonth } from "../utils/dates";
import { getLocalDateString, getEffectiveReflectionDate, shouldTriggerLock } from "../utils/lock";

describe("dates", () => {
  it("toLocalDate returns a locale date string", () => {
    const result = toLocalDate("2024-06-15T12:00:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("toLocalDateTime returns a locale datetime string", () => {
    const result = toLocalDateTime("2024-06-15T12:00:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("startOfWeek returns a Monday", () => {
    const start = startOfWeek();
    // getDay() returns 0 for Sunday, 1 for Monday
    expect(start.getDay()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });

  it("startOfMonth returns the 1st", () => {
    const start = startOfMonth();
    expect(start.getDate()).toBe(1);
  });
});

describe("lock date utils", () => {
  it("getLocalDateString returns YYYY-MM-DD format", () => {
    const result = getLocalDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("getEffectiveReflectionDate returns YYYY-MM-DD format", () => {
    const result = getEffectiveReflectionDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("shouldTriggerLock returns boolean", () => {
    const result = shouldTriggerLock(null);
    expect(typeof result).toBe("boolean");
  });

  it("shouldTriggerLock returns false when already reflected today", () => {
    const today = getLocalDateString();
    expect(shouldTriggerLock(today)).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it passes** (tests existing code)

Run: `npx vitest run src/lib/__tests__/dates.test.ts`
Expected: PASS

- [ ] **Step 4: Remove dead code from dates.ts**

Replace `src/lib/utils/dates.ts` with:
```typescript
export function toLocalDate(utcDate: string): string {
  return new Date(utcDate).toLocaleDateString();
}

export function toLocalDateTime(utcDate: string): string {
  return new Date(utcDate).toLocaleString();
}

export function startOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
```

- [ ] **Step 5: Export formatLocalDate from lock.ts**

In `src/lib/utils/lock.ts`, change `function formatLocalDate` to `export function formatLocalDate`.

- [ ] **Step 6: Run tests again**

Run: `npx vitest run src/lib/__tests__/dates.test.ts`
Expected: PASS

- [ ] **Step 7: Build check**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/lib/utils/dates.ts src/lib/utils/lock.ts src/lib/__tests__/dates.test.ts
git commit -m "remove dead date utilities, export formatLocalDate"
```

---

### Task 5: Standardize temp ID utilities

**Files:**
- Create: `src/lib/utils/temp-id.ts`
- Create: `src/lib/__tests__/temp-id.test.ts`

- [ ] **Step 1: Write the test**

Create `src/lib/__tests__/temp-id.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { createTempId, isTempId } from "../utils/temp-id";

describe("createTempId", () => {
  it("creates an ID with the given prefix", () => {
    const id = createTempId("objective");
    expect(id).toMatch(/^temp_objective_\d+$/);
  });

  it("creates unique IDs", () => {
    const a = createTempId("todo");
    const b = createTempId("todo");
    expect(a).not.toBe(b);
  });

  it("works with no prefix", () => {
    const id = createTempId();
    expect(id).toMatch(/^temp_\d+$/);
  });
});

describe("isTempId", () => {
  it("returns true for temp IDs", () => {
    expect(isTempId("temp_objective_123")).toBe(true);
    expect(isTempId("temp_123")).toBe(true);
    expect(isTempId("temp_push_456")).toBe(true);
  });

  it("returns false for real IDs", () => {
    expect(isTempId("objective_123")).toBe(false);
    expect(isTempId("push_123")).toBe(false);
    expect(isTempId("abc-def-ghi")).toBe(false);
  });

  it("returns false for legacy push_temp_ IDs", () => {
    // push_temp_ was the old pattern — isTempId normalizes to temp_ prefix
    expect(isTempId("push_temp_123")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/temp-id.test.ts`
Expected: FAIL - cannot find module

- [ ] **Step 3: Write the implementation**

Create `src/lib/utils/temp-id.ts`:
```typescript
let counter = 0;

export function createTempId(prefix?: string): string {
  const id = `${Date.now()}_${counter++}`;
  return prefix ? `temp_${prefix}_${id}` : `temp_${id}`;
}

export function isTempId(id: string): boolean {
  return id.startsWith("temp_");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/temp-id.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/temp-id.ts src/lib/__tests__/temp-id.test.ts
git commit -m "add standardized temp ID utilities"
```

---

### Task 6: Wire temp ID utilities into server actions

**Files:**
- Modify: `src/app/(dashboard)/first-principles/actions.ts`
- Modify: `src/app/(dashboard)/network/actions.ts`

This task replaces all `startsWith("temp_")` and `startsWith("push_temp_")` checks with `isTempId()`, and replaces inline ID generation with `createTempId()`.

- [ ] **Step 1: Update first-principles/actions.ts**

In `src/app/(dashboard)/first-principles/actions.ts`:
- Add import: `import { createTempId, isTempId } from "@/lib/utils/temp-id";`
- Line 17: replace `\`objective_${Date.now()}\`` with `createTempId("objective")`
- Line 52: replace `id.startsWith("temp_")` with `isTempId(id)`
- Line 59: replace `!id.startsWith("temp_")` with `!isTempId(id)`
- Line 121: replace `objectiveId.startsWith("temp_")` with `isTempId(objectiveId)`
- Line 178: replace `id.startsWith("temp_")` with `isTempId(id)`
- Line 201: replace `id.startsWith("temp_")` with `isTempId(id)`
- Line 210: replace `!u.id.startsWith("temp_")` with `!isTempId(u.id)`
- Line 220: replace `id.startsWith("temp_")` with `isTempId(id)`
- Line 237: replace `` `push_${Date.now()}` `` with `createTempId("push")`
- Line 276: replace `id.startsWith("push_temp_")` with `isTempId(id)`
- Line 287: replace `id.startsWith("push_temp_")` with `isTempId(id)`
- Line 328: replace `id.startsWith("push_temp_")` with `isTempId(id)`
- Line 340: replace `pushId.startsWith("push_temp_")` with `isTempId(pushId)`

- [ ] **Step 2: Update network/actions.ts**

In `src/app/(dashboard)/network/actions.ts`:
- Add import: `import { isTempId } from "@/lib/utils/temp-id";`
- Line 36: replace `id.startsWith("temp_")` with `isTempId(id)`
- Line 46: replace `id.startsWith("temp_")` with `isTempId(id)`
- Line 56: replace `!id.startsWith("temp_")` with `!isTempId(id)`
- Line 101: replace `id.startsWith("temp_")` with `isTempId(id)`
- Line 113: replace `!u.id.startsWith("temp_")` with `!isTempId(u.id)`
- Line 149: replace `id.startsWith("temp_")` with `isTempId(id)`

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/first-principles/actions.ts src/app/\(dashboard\)/network/actions.ts
git commit -m "standardize temp ID checks with isTempId utility"
```

---

### Task 7: Wire temp ID utilities into components

**Files:**
- Modify: `src/components/todos/todos-panel.tsx`
- Modify: `src/components/network/network-group-tile.tsx`
- Modify: `src/components/network/network-panel.tsx`
- Modify: `src/components/pushes/pushes-panel.tsx`

- [ ] **Step 1: Update todos-panel.tsx**

In `src/components/todos/todos-panel.tsx`:
- Add import: `import { createTempId, isTempId } from "@/lib/utils/temp-id";`
- Line 53: replace `t.id.startsWith("temp_")` with `isTempId(t.id)`
- Line 89: replace `t.id.startsWith("temp_") && t.description === newTodo.description && t.panel === newTodo.panel` with `isTempId(t.id) && t.description === newTodo.description && t.panel === newTodo.panel`
- Line 144: replace `` `temp_${Date.now()}` `` with `createTempId("todo")`

- [ ] **Step 2: Update network-group-tile.tsx**

In `src/components/network/network-group-tile.tsx`:
- Add import: `import { createTempId, isTempId } from "@/lib/utils/temp-id";`
- Line 103: replace `c.id.startsWith("temp_")` with `isTempId(c.id)`
- Line 152: replace `` `temp_${Date.now()}` `` with `createTempId("contact")`

- [ ] **Step 3: Update network-panel.tsx**

In `src/components/network/network-panel.tsx`:
- Add import: `import { createTempId, isTempId } from "@/lib/utils/temp-id";`
- Line 67: replace `g.id.startsWith("temp_")` with `isTempId(g.id)`
- Line 94: replace `` `temp_${Date.now()}` `` with `createTempId("group")`

- [ ] **Step 4: Update pushes-panel.tsx**

In `src/components/pushes/pushes-panel.tsx`:
- Add import: `import { createTempId, isTempId } from "@/lib/utils/temp-id";`
- Line 46: replace `` `push_temp_${Date.now()}` `` with `createTempId("push")`
- Line 103: replace `push.id.startsWith("push_temp_")` with `isTempId(push.id)`

- [ ] **Step 5: Build check**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/todos/todos-panel.tsx src/components/network/network-group-tile.tsx src/components/network/network-panel.tsx src/components/pushes/pushes-panel.tsx
git commit -m "use createTempId/isTempId in all components"
```

---

### Task 8: Extract useDndSensors hook

**Files:**
- Create: `src/lib/hooks/use-dnd-sensors.ts`
- Create: `src/lib/__tests__/use-dnd-sensors.test.ts`

- [ ] **Step 1: Write the test**

Create `src/lib/__tests__/use-dnd-sensors.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDndSensors } from "../hooks/use-dnd-sensors";

describe("useDndSensors", () => {
  it("returns sensors array with default distance", () => {
    const { result } = renderHook(() => useDndSensors());
    expect(result.current).toBeDefined();
    // SensorDescriptor array
    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current.length).toBe(2);
  });

  it("accepts custom distance", () => {
    const { result } = renderHook(() => useDndSensors({ distance: 10 }));
    expect(result.current).toBeDefined();
    expect(result.current.length).toBe(2);
  });
});
```

- [ ] **Step 2: Install @testing-library/react**

Run: `npm install -D @testing-library/react @testing-library/dom jsdom`

Add to `vitest.config.ts` test config:
```typescript
environment: "jsdom",
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/use-dnd-sensors.test.ts`
Expected: FAIL - cannot find module

- [ ] **Step 4: Write the hook**

Create `src/lib/hooks/use-dnd-sensors.ts`:
```typescript
"use client";

import {
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

interface UseDndSensorsOptions {
  distance?: number;
}

export function useDndSensors({ distance = 5 }: UseDndSensorsOptions = {}) {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/use-dnd-sensors.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/hooks/use-dnd-sensors.ts src/lib/__tests__/use-dnd-sensors.test.ts vitest.config.ts package.json package-lock.json
git commit -m "extract useDndSensors hook"
```

---

### Task 9: Wire useDndSensors into components

**Files:**
- Modify: `src/components/todos/todos-panel.tsx`
- Modify: `src/components/objectives/objectives-panel.tsx`
- Modify: `src/components/network/network-group-tile.tsx`
- Modify: `src/components/network/network-panel.tsx`

- [ ] **Step 1: Update todos-panel.tsx**

In `src/components/todos/todos-panel.tsx`:
- Add import: `import { useDndSensors } from "@/lib/hooks/use-dnd-sensors";`
- Remove these imports from `@dnd-kit/core`: `PointerSensor`, `KeyboardSensor`, `useSensor`, `useSensors`
- Remove import of `sortableKeyboardCoordinates` from `@dnd-kit/sortable`
- Replace lines 67-70 (the `const sensors = useSensors(...)` block) with:
```typescript
const sensors = useDndSensors();
```

- [ ] **Step 2: Update objectives-panel.tsx**

In `src/components/objectives/objectives-panel.tsx`:
- Add import: `import { useDndSensors } from "@/lib/hooks/use-dnd-sensors";`
- Remove `KeyboardSensor`, `PointerSensor`, `useSensor`, `useSensors` from `@dnd-kit/core` import
- Remove `sortableKeyboardCoordinates` from `@dnd-kit/sortable` import
- Replace lines 52-55 (the `const sensors = useSensors(...)` block) with:
```typescript
const sensors = useDndSensors();
```

- [ ] **Step 3: Update network-group-tile.tsx**

In `src/components/network/network-group-tile.tsx`:
- Add import: `import { useDndSensors } from "@/lib/hooks/use-dnd-sensors";`
- Remove `PointerSensor`, `KeyboardSensor`, `useSensor`, `useSensors` from `@dnd-kit/core` import
- Remove `sortableKeyboardCoordinates` from `@dnd-kit/sortable` import (keep `arrayMove`)
- Replace lines 82-85 (the `const sensors = useSensors(...)` block) with:
```typescript
const sensors = useDndSensors();
```

- [ ] **Step 4: Update network-panel.tsx**

In `src/components/network/network-panel.tsx`:
- Add import: `import { useDndSensors } from "@/lib/hooks/use-dnd-sensors";`
- Remove `PointerSensor`, `KeyboardSensor`, `useSensor`, `useSensors` from `@dnd-kit/core` import
- Remove `sortableKeyboardCoordinates` from `@dnd-kit/sortable` import (keep `arrayMove`, `rectSortingStrategy`)
- Replace lines 52-55 (the `const sensors = useSensors(...)` block) with:
```typescript
const sensors = useDndSensors({ distance: 8 });
```
Note: network-panel uses distance 8 (not 5), so pass it explicitly.

- [ ] **Step 5: Build check**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/todos/todos-panel.tsx src/components/objectives/objectives-panel.tsx src/components/network/network-group-tile.tsx src/components/network/network-panel.tsx
git commit -m "replace inline DnD sensor setup with useDndSensors hook"
```

---

### Task 10: Add "use server" to admin.ts and standardize createPush error handling

**Files:**
- Modify: `src/lib/supabase/admin.ts`
- Modify: `src/app/(dashboard)/first-principles/actions.ts`
- Modify: `src/components/pushes/pushes-panel.tsx`

- [ ] **Step 1: Add "use server" to admin.ts**

At the top of `src/lib/supabase/admin.ts`, add as the very first line:
```typescript
"use server";
```

- [ ] **Step 2: Standardize createPush to throw**

In `src/app/(dashboard)/first-principles/actions.ts`, change `createPush`:

Replace the function signature and error handling:
```typescript
export async function createPush(data: {
  name: string;
  description?: string;
  todos_notes?: string;
  notes?: string;
}): Promise<string> {
  const supabase = await createClient();
  const id = createTempId("push");

  const { count } = await supabase
    .from("pushes")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  if ((count ?? 0) >= MAX_ACTIVE_PUSHES) {
    throw new Error(`Maximum ${MAX_ACTIVE_PUSHES} active pushes allowed`);
  }

  const { data: maxOrder } = await supabase
    .from("pushes")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const { error } = await supabase.from("pushes").insert({
    id,
    name: data.name,
    description: data.description ?? null,
    todos_notes: data.todos_notes ?? null,
    notes: data.notes ?? null,
    sort_order: (maxOrder?.sort_order ?? -1) + 1,
  });

  if (error) throw new Error(error.message);
  return id;
}
```

- [ ] **Step 3: Update pushes-panel.tsx to match new signature**

In `src/components/pushes/pushes-panel.tsx`, update the `handleCreate` function. Replace the `startTransition` block (lines 63-77):
```typescript
    startTransition(async () => {
      try {
        const id = await createPush({ name: "New Push" });
        creatingRef.current = false;
        onPushesChange((prev) =>
          prev.map((p) => (p.id === tempId ? { ...p, id } : p))
        );
        onSelect(id);
      } catch {
        creatingRef.current = false;
        onPushesChange((prev) => prev.filter((p) => p.id !== tempId));
      }
    });
```

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/admin.ts src/app/\(dashboard\)/first-principles/actions.ts src/components/pushes/pushes-panel.tsx
git commit -m "add use server to admin client, standardize createPush to throw"
```

---

### Task 11: Fix LLM provider error inconsistency

**Files:**
- Modify: `src/lib/agents/llm.ts`

- [ ] **Step 1: Fix OpenAI silent empty string**

In `src/lib/agents/llm.ts`, replace line 98:
```typescript
  return data.choices?.[0]?.message?.content ?? "";
```
with:
```typescript
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No text content in OpenAI response");
  return content;
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/llm.ts
git commit -m "throw on empty OpenAI response instead of silent empty string"
```

---

### Task 12: Add error handling to getSystemState

**Files:**
- Modify: `src/lib/supabase/cached-queries.ts`

- [ ] **Step 1: Add error handling**

Replace `src/lib/supabase/cached-queries.ts` with:
```typescript
import { cache } from "react";
import { createClient } from "./server";

export const getSystemState = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("system_state")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) throw new Error(`Failed to fetch system state: ${error.message}`);
  return data;
});
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/cached-queries.ts
git commit -m "add error handling to getSystemState cached query"
```

---

### Task 13: Run full test suite and final build

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 2: Full production build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No new lint errors.

---

### Task 14: Update CLAUDE.md with new patterns

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add new patterns section**

Add the following section to `CLAUDE.md` after the "Coding Rules" section:

```markdown
## Shared Utilities & Patterns

- **Constants**: All magic numbers live in `src/lib/constants.ts`. Never inline numeric thresholds.
- **Temp IDs**: Use `createTempId(prefix)` and `isTempId(id)` from `src/lib/utils/temp-id.ts`. All temp IDs start with `temp_`.
- **DnD sensors**: Use `useDndSensors()` from `src/lib/hooks/use-dnd-sensors.ts` instead of inline sensor setup. Pass `{ distance: N }` to customize activation distance.
- **Date utilities**: `src/lib/utils/dates.ts` for display formatting. `src/lib/utils/lock.ts` for lock-system dates. No duplicate date functions.
- **Supabase clients**: `src/lib/supabase/client.ts` (browser), `src/lib/supabase/server.ts` (server components/actions), `src/lib/supabase/admin.ts` (service role, server-only).
- **Error handling in server actions**: Always throw on error. Never return `{ error: string }` — callers use try/catch.
- **Tests**: `vitest` for pure utility tests. Test files at `src/lib/__tests__/*.test.ts`.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "document shared utilities and patterns in CLAUDE.md"
```
