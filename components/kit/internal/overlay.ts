// Shared overlay mechanics for Drawer / FrictionDeleteDialog / BottomSheet /
// MobileNavDrawer. Session 10 Deliverable 3c — the reported "transparent modal",
// no-scroll-lock, broken-focus-trap bugs are fixed once here, not per component.
//
// design-principles.md §9 + handoff §3c:
//   - the panel background is opaque --surface-raised (never --surface-panel-tint)
//   - the backdrop is the shared .kit-scrim (blur + --opacity-scrim + --z-overlay),
//     authored in app/globals.css — components render <div className="kit-scrim">
//   - on open: focus moves into the panel; focus is trapped (recomputed every Tab,
//     handles the no-focusable and dynamically-added-node cases); the background is
//     inert; <html> gets overflow:hidden, restored exactly on close
//   - on close: focus returns to whatever opened it
//   - two overlays are never both interactive (a module-level active-overlay guard)
//   - enter/exit is a transform slide (--dur-base, --ease-decelerate / -accelerate),
//     never a layout transition
"use client";

import * as React from "react";

/* ------------------------------------------------------------------ *
 * 1. Active-overlay guard (X5) — only one overlay interactive at once
 * ------------------------------------------------------------------ */

let activeOverlayId: string | null = null;
const overlayListeners = new Set<() => void>();

function notifyOverlayChange() {
  for (const l of overlayListeners) l();
}

/**
 * Claims the single "active overlay" slot while `active` is true. Returns
 * `isBlocked` — true when some *other* overlay currently holds the slot, so the
 * caller can skip rendering its interactive surface (or render it inert).
 */
export function useActiveOverlay(active: boolean): { isBlocked: boolean } {
  const idRef = React.useRef<string>("");
  if (!idRef.current) {
    idRef.current = `ovl-${Math.random().toString(36).slice(2)}`;
  }
  const id = idRef.current;

  const subscribe = React.useCallback((cb: () => void) => {
    overlayListeners.add(cb);
    return () => {
      overlayListeners.delete(cb);
    };
  }, []);
  const getSnapshot = React.useCallback(() => activeOverlayId, []);
  const current = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  React.useEffect(() => {
    if (!active) return;
    const prev = activeOverlayId;
    activeOverlayId = id;
    notifyOverlayChange();
    return () => {
      // Only relinquish if we still hold it (StrictMode double-invoke safe).
      if (activeOverlayId === id) {
        activeOverlayId = prev;
        notifyOverlayChange();
      }
    };
  }, [active, id]);

  return { isBlocked: active && current !== null && current !== id };
}

/* ------------------------------------------------------------------ *
 * 2. Scroll-lock (X3) — <html> overflow:hidden, restored exactly
 * ------------------------------------------------------------------ */

let scrollLockCount = 0;
let savedOverflow = "";
let savedPaddingRight = "";

export function useScrollLock(active: boolean) {
  React.useEffect(() => {
    if (!active) return;
    const el = document.documentElement;
    if (scrollLockCount === 0) {
      savedOverflow = el.style.overflow;
      savedPaddingRight = el.style.paddingRight;
      // Compensate for the scrollbar so the page doesn't shift.
      const sbw = window.innerWidth - el.clientWidth;
      if (sbw > 0) el.style.paddingRight = `${sbw}px`;
      el.style.overflow = "hidden";
    }
    scrollLockCount += 1;
    return () => {
      scrollLockCount -= 1;
      if (scrollLockCount === 0) {
        el.style.overflow = savedOverflow;
        el.style.paddingRight = savedPaddingRight;
      }
    };
  }, [active]);
}

/* ------------------------------------------------------------------ *
 * 3. Background inert (X3) — everything outside the overlay root
 * ------------------------------------------------------------------ */

/**
 * Marks every top-level sibling of the overlay container as `inert` (with an
 * `aria-hidden` + `pointer-events:none` fallback for older engines) while
 * `active`. The overlay container itself is identified by `containerRef`.
 *
 * Key this on `active` (mounted && not closing), NOT on `mounted`: the
 * background must stop being inert the instant the close begins, so
 * useFocusTrap's cleanup can move focus back to the opener. Keeping it inert
 * through the slide-out makes `.focus()` on the opener a spec no-op (focus
 * falls to <body>) — the WCAG 2.4.3 regression the harness caught. Nothing
 * outside the panel is interactive during a ~200ms slide-out anyway.
 */
export function useBackgroundInert(
  containerRef: React.RefObject<HTMLElement | null>,
  active: boolean,
) {
  React.useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    const root = document.body;
    const touched: HTMLElement[] = [];

    for (const child of Array.from(root.children)) {
      if (!(child instanceof HTMLElement)) continue;
      if (child === container || child.contains(container)) continue;
      if (child.hasAttribute("data-overlay-ignore-inert")) continue;
      touched.push(child);
      child.setAttribute("inert", "");
      child.setAttribute("aria-hidden", "true");
      child.style.setProperty("pointer-events", "none");
    }

    return () => {
      for (const el of touched) {
        el.removeAttribute("inert");
        el.removeAttribute("aria-hidden");
        el.style.removeProperty("pointer-events");
      }
    };
  }, [containerRef, active]);
}

/* ------------------------------------------------------------------ *
 * 4. Focus trap (X4) — recomputed every Tab; no-focusable + dynamic
 * ------------------------------------------------------------------ */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(",");

function focusablesIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      el.offsetWidth > 0 ||
      el.offsetHeight > 0 ||
      el === document.activeElement,
  );
}

/**
 * Traps focus inside `panelRef` while `active`. On activate, moves focus to the
 * first focusable (or the panel itself if none — the panel must be
 * `tabIndex={-1}`). Recomputes the focusable set on every Tab so nodes added
 * after open are included. On deactivate, restores focus to whatever was focused
 * when the trap engaged (the opener).
 */
export function useFocusTrap(
  panelRef: React.RefObject<HTMLElement | null>,
  active: boolean,
) {
  const restoreRef = React.useRef<HTMLElement | null>(null);

  // Capture the opener in a LAYOUT effect so it runs before any passive effect
  // (e.g. useBackgroundInert) can `inert` the opener's container and blur it —
  // otherwise `document.activeElement` here is already <body>.
  React.useLayoutEffect(() => {
    if (!active) return;
    if (
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
    ) {
      restoreRef.current = document.activeElement;
    }
  }, [active]);

  React.useEffect(() => {
    if (!active) return;
    const panel = panelRef.current;
    if (!panel) return;

    // Move focus in.
    const initial = focusablesIn(panel);
    if (initial.length > 0) {
      initial[0].focus();
    } else {
      panel.focus();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const panelEl = panelRef.current;
      if (!panelEl) return;
      const items = focusablesIn(panelEl);
      if (items.length === 0) {
        // Nothing focusable — keep focus on the panel.
        e.preventDefault();
        panelEl.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (!panelEl.contains(activeEl)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      const toRestore = restoreRef.current;
      if (!toRestore) return;

      // Why this is deferred and retried, not a single synchronous `.focus()`:
      //
      // On close the overlay stays *mounted* through its slide-out (see
      // useOverlayTransition), and useBackgroundInert keeps the opener's
      // container `inert` for that whole window. `.focus()` on an element
      // inside an `[inert]` subtree is a spec no-op — it silently fails and
      // `document.activeElement` falls back to <body>. That was the WCAG
      // 2.4.3 regression the proof harness caught.
      //
      // So: restore only once the opener is actually focusable again —
      // reattached to the document AND clear of any `[inert]` ancestor. We
      // also proactively lift a stale inert/aria-hidden off its ancestor
      // chain (useBackgroundInert may not have cleaned up yet), then poll a
      // few frames for the mount/inert state to settle.
      const isFocusable = (el: HTMLElement) => {
        if (!document.contains(el)) return false;
        for (let p: HTMLElement | null = el; p; p = p.parentElement) {
          if (p.hasAttribute("inert")) return false;
        }
        return true;
      };
      const liftInertAncestors = (el: HTMLElement) => {
        for (let p: HTMLElement | null = el; p; p = p.parentElement) {
          if (p === document.body) break;
          if (p.hasAttribute("inert")) {
            p.removeAttribute("inert");
            p.removeAttribute("aria-hidden");
            p.style.removeProperty("pointer-events");
          }
        }
      };

      let tries = 0;
      const attempt = () => {
        if (!document.contains(toRestore)) {
          if (tries++ < 20) requestAnimationFrame(attempt);
          return;
        }
        liftInertAncestors(toRestore);
        if (isFocusable(toRestore)) {
          toRestore.focus();
          return;
        }
        if (tries++ < 20) requestAnimationFrame(attempt);
      };
      // First hop is a macrotask so it lands after React has flushed this
      // commit's *other* effect cleanups (useBackgroundInert removing inert
      // when keyed on `active`); rAF retries cover the still-mounted case.
      setTimeout(attempt, 0);
      requestAnimationFrame(attempt);
    };
  }, [panelRef, active]);
}

/* ------------------------------------------------------------------ *
 * 5. Enter / exit transition (X6) — mount now, unmount after slide-out
 * ------------------------------------------------------------------ */

export type OverlayPhase = "closed" | "opening" | "open" | "closing";

/**
 * Keeps an overlay mounted through its slide-out. Returns:
 *   mounted   — render the overlay at all?
 *   phase     — drive `data-state` on scrim + panel ("open" | "closing" | "opening")
 *   endExit   — call from the panel's onTransitionEnd to finish unmount
 *
 * The panel/scrim CSS keys the transform + opacity off `[data-state]`.
 */
export function useOverlayTransition(open: boolean): {
  mounted: boolean;
  phase: Exclude<OverlayPhase, "closed">;
  endExit: () => void;
} {
  const [mounted, setMounted] = React.useState(open);
  const [phase, setPhase] = React.useState<Exclude<OverlayPhase, "closed">>(
    open ? "open" : "opening",
  );

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      setPhase("opening");
      // Next frame → "open" so the transform transitions from the closed offset.
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase("open"));
      });
      return () => cancelAnimationFrame(raf);
    }
    if (mounted) {
      setPhase("closing");
      // Safety net: the panel unmounts on `transitionend`, but that event can
      // fail to fire (reduced-motion, a display-change mid-transition, a
      // headless runner). Force the unmount slightly past the slide duration
      // so the overlay can never get stuck mounted.
      const fallback = setTimeout(() => {
        setMounted(false);
        setPhase("opening");
      }, 400);
      return () => clearTimeout(fallback);
    }
  }, [open, mounted]);

  const endExit = React.useCallback(() => {
    setPhase((p) => {
      if (p === "closing") {
        setMounted(false);
        return "opening";
      }
      return p;
    });
  }, []);

  return { mounted, phase, endExit };
}

/* ------------------------------------------------------------------ *
 * 6. Esc-to-close — shared so every overlay behaves the same
 * ------------------------------------------------------------------ */

export function useEscToClose(active: boolean, onClose: () => void) {
  React.useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, onClose]);
}
