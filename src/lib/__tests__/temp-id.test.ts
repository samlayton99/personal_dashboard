import { describe, it, expect } from "vitest";
import { createTempId, isTempId } from "../utils/temp-id";

describe("createTempId", () => {
  it("creates an ID with the given prefix", () => {
    const id = createTempId("objective");
    expect(id).toMatch(/^temp_objective_\d+_\d+$/);
  });

  it("creates unique IDs", () => {
    const a = createTempId("todo");
    const b = createTempId("todo");
    expect(a).not.toBe(b);
  });

  it("works with no prefix", () => {
    const id = createTempId();
    expect(id).toMatch(/^temp_\d+_\d+$/);
  });
});

describe("isTempId", () => {
  it("returns true for temp IDs", () => {
    expect(isTempId("temp_objective_123_0")).toBe(true);
    expect(isTempId("temp_123_0")).toBe(true);
    expect(isTempId("temp_push_456_1")).toBe(true);
  });

  it("returns false for real IDs", () => {
    expect(isTempId("objective_123")).toBe(false);
    expect(isTempId("push_123")).toBe(false);
    expect(isTempId("abc-def-ghi")).toBe(false);
  });

  it("returns false for legacy push_temp_ IDs", () => {
    expect(isTempId("push_temp_123")).toBe(false);
  });
});
