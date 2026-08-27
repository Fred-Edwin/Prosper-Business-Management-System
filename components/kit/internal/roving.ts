// Shared WAI-ARIA APG keyboard helper for the single-select control group
// pattern — Tabs (tablist), PillFilter (radiogroup), SegmentedControl
// (radiogroup). Session 10 Deliverable 3b/3c.
//
// Roving tabindex: exactly one item in the group is in the Tab sequence (the
// selected one); ArrowLeft/Right (and Up/Down) move selection to the previous /
// next enabled item and focus it; Home/End jump to the first / last enabled item.
// Selection follows focus (APG "selection follows focus" — correct for tabs and
// radiogroups where activating is cheap).
"use client";

import * as React from "react";

export interface RovingItem {
  key: string;
  disabled?: boolean;
}

export function useRovingGroup({
  items,
  activeKey,
  onChange,
  orientation = "horizontal",
}: {
  items: RovingItem[];
  activeKey: string;
  onChange?: (key: string) => void;
  orientation?: "horizontal" | "vertical" | "both";
}) {
  const enabled = items.filter((i) => !i.disabled);

  const move = React.useCallback(
    (dir: 1 | -1 | "home" | "end") => {
      if (enabled.length === 0) return;
      let nextIdx: number;
      if (dir === "home") {
        nextIdx = 0;
      } else if (dir === "end") {
        nextIdx = enabled.length - 1;
      } else {
        const curIdx = Math.max(
          0,
          enabled.findIndex((i) => i.key === activeKey),
        );
        nextIdx = (curIdx + dir + enabled.length) % enabled.length;
      }
      onChange?.(enabled[nextIdx].key);
    },
    [enabled, activeKey, onChange],
  );

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const horiz = orientation === "horizontal" || orientation === "both";
      const vert = orientation === "vertical" || orientation === "both";
      switch (e.key) {
        case "ArrowRight":
          if (!horiz) return;
          e.preventDefault();
          move(1);
          break;
        case "ArrowLeft":
          if (!horiz) return;
          e.preventDefault();
          move(-1);
          break;
        case "ArrowDown":
          if (!vert) return;
          e.preventDefault();
          move(1);
          break;
        case "ArrowUp":
          if (!vert) return;
          e.preventDefault();
          move(-1);
          break;
        case "Home":
          e.preventDefault();
          move("home");
          break;
        case "End":
          e.preventDefault();
          move("end");
          break;
        default:
      }
    },
    [move, orientation],
  );

  /** tabIndex for an item: 0 if it's the active one (or, if the active one is
   * disabled/missing, the first enabled item), else -1. */
  const tabIndexFor = React.useCallback(
    (key: string) => {
      const activeIsEnabled = enabled.some((i) => i.key === activeKey);
      if (activeIsEnabled) return key === activeKey ? 0 : -1;
      return enabled[0]?.key === key ? 0 : -1;
    },
    [enabled, activeKey],
  );

  return { onKeyDown, tabIndexFor };
}
