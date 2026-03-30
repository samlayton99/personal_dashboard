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
