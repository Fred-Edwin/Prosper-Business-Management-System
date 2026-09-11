// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAdminDateRange } from "./use-date-range";

describe("useAdminDateRange — setCustomRange", () => {
  it("sets an arbitrary from..to custom range", () => {
    const { result } = renderHook(() => useAdminDateRange());
    act(() => result.current.setCustomRange("2026-09-01", "2026-09-07"));
    expect(result.current.range).toEqual({
      preset: "custom",
      from: "2026-09-01",
      to: "2026-09-07",
    });
  });

  it("clamps `to` to `from` when `to` would precede it", () => {
    const { result } = renderHook(() => useAdminDateRange());
    act(() => result.current.setCustomRange("2026-09-07", "2026-09-01"));
    expect(result.current.range).toEqual({
      preset: "custom",
      from: "2026-09-07",
      to: "2026-09-07",
    });
  });

  it("supports a single-day custom range (from === to)", () => {
    const { result } = renderHook(() => useAdminDateRange());
    act(() => result.current.setCustomRange("2026-09-03", "2026-09-03"));
    expect(result.current.range).toEqual({
      preset: "custom",
      from: "2026-09-03",
      to: "2026-09-03",
    });
  });
});
