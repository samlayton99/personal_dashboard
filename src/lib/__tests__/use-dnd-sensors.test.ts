import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDndSensors } from "../hooks/use-dnd-sensors";

describe("useDndSensors", () => {
  it("returns sensors array with default distance", () => {
    const { result } = renderHook(() => useDndSensors());
    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current.length).toBe(2);
  });

  it("accepts custom distance", () => {
    const { result } = renderHook(() => useDndSensors({ distance: 10 }));
    expect(result.current).toBeDefined();
    expect(result.current.length).toBe(2);
  });
});
