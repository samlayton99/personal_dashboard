import { describe, it, expect, vi, afterEach } from "vitest";
import { shouldTriggerLock, getEffectiveReflectionDate, getLastLockBoundary, formatLocalDate } from "../utils/lock";

function mockDate(dateStr: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(dateStr));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("shouldTriggerLock", () => {
  it("returns true when lastReflectionDate is null", () => {
    expect(shouldTriggerLock(null)).toBe(true);
  });

  it("returns false when already reflected today (before 10 PM)", () => {
    mockDate("2026-04-15T14:00:00"); // 2 PM
    expect(shouldTriggerLock("2026-04-15")).toBe(false);
  });

  it("returns false when already reflected today (after 10 PM)", () => {
    mockDate("2026-04-15T23:00:00"); // 11 PM
    expect(shouldTriggerLock("2026-04-15")).toBe(false);
  });

  it("returns true for catch-up (>1 day stale) at any hour", () => {
    mockDate("2026-04-15T09:00:00"); // 9 AM, well before 10 PM
    expect(shouldTriggerLock("2026-04-12")).toBe(true); // 3 days stale
  });

  it("returns true for catch-up at 3 AM", () => {
    mockDate("2026-04-15T03:00:00");
    expect(shouldTriggerLock("2026-04-13")).toBe(true); // 2 days stale
  });

  it("returns false for yesterday before 10 PM", () => {
    mockDate("2026-04-15T14:00:00"); // 2 PM
    expect(shouldTriggerLock("2026-04-14")).toBe(false);
  });

  it("returns true for yesterday at/after 10 PM", () => {
    mockDate("2026-04-15T22:00:00"); // 10 PM
    expect(shouldTriggerLock("2026-04-14")).toBe(true);
  });

  it("returns true for yesterday at 11 PM", () => {
    mockDate("2026-04-15T23:30:00");
    expect(shouldTriggerLock("2026-04-14")).toBe(true);
  });
});

describe("getEffectiveReflectionDate", () => {
  it("returns yesterday when unlocking before 10 PM", () => {
    mockDate("2026-04-15T14:00:00"); // 2 PM
    expect(getEffectiveReflectionDate()).toBe("2026-04-14");
  });

  it("returns today when unlocking at 10 PM", () => {
    mockDate("2026-04-15T22:00:00");
    expect(getEffectiveReflectionDate()).toBe("2026-04-15");
  });

  it("returns today when unlocking at 11 PM", () => {
    mockDate("2026-04-15T23:30:00");
    expect(getEffectiveReflectionDate()).toBe("2026-04-15");
  });
});

describe("getLastLockBoundary", () => {
  it("returns yesterday 10 PM when before 10 PM today", () => {
    mockDate("2026-04-15T14:00:00"); // 2 PM
    const boundary = new Date(getLastLockBoundary());
    expect(boundary.getDate()).toBe(14);
    expect(boundary.getHours()).toBe(22);
  });

  it("returns today 10 PM when after 10 PM", () => {
    mockDate("2026-04-15T23:00:00"); // 11 PM
    const boundary = new Date(getLastLockBoundary());
    expect(boundary.getDate()).toBe(15);
    expect(boundary.getHours()).toBe(22);
  });

  it("returns today 10 PM when exactly 10 PM", () => {
    mockDate("2026-04-15T22:00:00");
    const boundary = new Date(getLastLockBoundary());
    expect(boundary.getDate()).toBe(15);
    expect(boundary.getHours()).toBe(22);
  });
});

describe("catch-up then tonight scenario", () => {
  it("unlock at 3 PM sets yesterday, tonight's 10 PM lock still fires", () => {
    // Unlock at 3 PM
    mockDate("2026-04-15T15:00:00");
    const effectiveDate = getEffectiveReflectionDate();
    expect(effectiveDate).toBe("2026-04-14"); // yesterday

    // At 10 PM same day, should the lock fire?
    mockDate("2026-04-15T22:00:00");
    expect(shouldTriggerLock("2026-04-14")).toBe(true); // yes
  });

  it("unlock at 10:30 PM sets today, no re-lock tonight", () => {
    mockDate("2026-04-15T22:30:00");
    const effectiveDate = getEffectiveReflectionDate();
    expect(effectiveDate).toBe("2026-04-15"); // today

    // Still at 10:30 PM, should lock re-fire?
    expect(shouldTriggerLock("2026-04-15")).toBe(false); // no
  });
});
