// Shared WAI-ARIA APG keyboard helper for the single-select control group
// pattern — Tabs (tablist), PillFilter (radiogroup), SegmentedControl
// (radiogroup). Session 10 Deliverable 3b/3c.
//
// Roving tabindex: exactly one item in the group is in the Tab sequence (the
// selected one); ArrowLeft/Right (and Up/Down) move selection to the previous /
// next enabled item AND move DOM focus to it; Home/End jump to the first / last
// enabled item. Selection follows focus (APG "selection follows focus" —
// correct for tabs and radiogroups where activating is cheap).
//
// Session 10b fix: `move()` changed selection via onChange but never focused the
// newly-selected node, so keyboard users lost the focus ring and screen-reader
// focus after an arrow press (APG violation; handoff §4d requires "ArrowRight
// moves aria-selected AND DOM focus"). The hook now takes an `itemRef(key)`
// callback ref and focuses the target after the selection re-render.
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

  // key → the item's DOM node, populated via the `itemRef` callback ref.
  const nodes = React.useRef(new Map<string, HTMLElement | null>());
  // Set by a keyboard move; focused in the effect below once the re-render with
  // the new roving tabIndex has committed (a tabIndex=-1 node can't hold focus).
  const pendingFocus = React.useRef<string | null>(null);

  const itemRef = React.useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) nodes.current.set(key, el);
      else nodes.current.delete(key);
    },
    [],
  );

  React.useEffect(() => {
    const key = pendingFocus.current;
    if (key == null) return;
    pendingFocus.current = null;
    nodes.current.get(key)?.focus();
  });

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
      const nextKey = enabled[nextIdx].key;
      pendingFocus.current = nextKey;
      if (nextKey === activeKey) {
        // selection unchanged (single enabled item, or wrap to self) — no
        // re-render will fire the effect, so focus now.
        pendingFocus.current = null;
        nodes.current.get(nextKey)?.focus();
      } else {
        onChange?.(nextKey);
      }
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

  return { onKeyDown, tabIndexFor, itemRef };
}
