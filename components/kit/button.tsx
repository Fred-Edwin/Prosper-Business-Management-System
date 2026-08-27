// Verbatim transcription of Paper artboard "Component Kit — Buttons & Actions" (6BR-0):
// the "Button Row" (6BU-0) base variants + the "Button State Row" (9KZ-0) disabled/loading
// states. Duplicate state markup is merged behind props (variant / disabled / loading),
// switching only the state-specific classes each state's own get_jsx emitted.
// hover / focus-visible / active are the design-principles.md §9 globals — .kit-focus-ring
// + .kit-interactive from app/globals.css, not re-specified here.
//
// FLAG (raw literal): the primary-loading state's get_jsx emits `bg-[#32125F]` rather than a
// token. --color-accent is oklch(28% 0.126 296). Kept verbatim per the transcription rule;
// noted in docs/PROGRESS.md for the owner.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

// The 14×14 spinner arc Paper draws inside the loading states, with its exact
// inline style (flexShrink: 0, marginRight: 6px).
function Spinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, marginRight: 6 }}
    >
      <path
        d="M12 3 A9 9 0 0 1 21 12"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Button({
  variant = "primary",
  loading = false,
  disabled = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  // Shell classes shared by every state (from every state's get_jsx).
  const shell =
    "flex items-center justify-center h-[36px] px-(--sp-6) rounded-sm";

  // State-specific box classes — the exact strings each state's get_jsx emitted.
  let box: string;
  let labelCls: string;

  if (loading) {
    switch (variant) {
      case "primary":
        box = "opacity-[0.7] bg-[#32125F]";
        labelCls = "text-white";
        break;
      case "destructive":
        box = "opacity-[0.7] bg-danger";
        labelCls = "text-white";
        break;
      // secondary / tertiary have no drawn loading state; fall back to their
      // disabled treatment (§9 covers in-flight for non-primary paths).
      default:
        box =
          "opacity-[0.5] bg-(--surface-page) border border-solid [border-color:var(--border-subtle)]";
        labelCls = "[color:var(--text-disabled)]";
    }
  } else if (isDisabled) {
    switch (variant) {
      case "primary":
      case "tertiary":
        box = "bg-gray-200";
        labelCls = "[color:var(--text-disabled)]";
        break;
      case "secondary":
        box =
          "opacity-[0.5] bg-(--surface-page) border border-solid [border-color:var(--border-subtle)]";
        labelCls = "[color:var(--text-disabled)]";
        break;
      case "destructive":
        box = "opacity-[0.5] bg-danger";
        labelCls = "text-white";
        break;
      default:
        box = "bg-gray-200";
        labelCls = "[color:var(--text-disabled)]";
    }
  } else {
    switch (variant) {
      case "primary":
        box = "bg-accent";
        labelCls = "text-white";
        break;
      case "secondary":
        box =
          "bg-(--surface-page) border border-solid [border-color:var(--border-strong)]";
        labelCls = "[color:var(--text-primary)]";
        break;
      case "tertiary":
        box = "";
        labelCls = "text-accent";
        break;
      case "destructive":
        box = "bg-danger";
        labelCls = "text-white";
        break;
      default:
        box = "bg-accent";
        labelCls = "text-white";
    }
  }

  return (
    <button
      type="button"
      className={cn(
        "[font-synthesis:none] antialiased kit-interactive kit-focus-ring",
        shell,
        box,
        className,
      )}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      {...props}
    >
      {loading && (variant === "primary" || variant === "destructive") && (
        <Spinner />
      )}
      <span className={cn("font-ui font-(--weight-medium) text-sm/sm", labelCls)}>
        {children}
      </span>
    </button>
  );
}
