// Verbatim REST transcription of Paper artboard "Component Kit — Buttons & Actions"
// (6BR-0): the "Button Row" (6BU-0) base variants + "Button State Row" (9KZ-0)
// disabled / loading. State-specific classes merged behind props.
//
// Session 10 (Deliverable 3c) rewire — behaviour + token usage only, REST layout
// and colour unchanged:
//   §9.5 hover  — set the --kit-hover-bg custom prop per variant so .kit-interactive
//                 hovers to the RIGHT colour (primary → --color-accent-hover,
//                 secondary/tertiary → --surface-hover, destructive →
//                 --color-danger-hover). Previously every variant hovered grey.
//   §9.6 active — same, via --kit-active-bg (falls back to hover).
//   §9.7 disabled — the shared .kit-interactive:disabled rule + `disabled` attr.
//                 The hand-rolled per-variant `bg-gray-200` / `opacity-[0.5]` is
//                 removed — disabled is opacity 0.5 over the REST fill (§9.7),
//                 not a separate grey.
//   §9.10 loading — `data-loading` drives the shared label-dim + pointer-lock;
//                 the <Spinner> primitive is rendered in the label colour and the
//                 button KEEPS ITS WIDTH (the label stays in flow, just dimmed).
//   labels — filled variants use --text-inverse, not a hard-coded white.
//   size — new `size` prop → --control-sm/md/lg. Default "md" is byte-identical
//          to the artboard (h-36). "sm"/"lg" have NO artboard — flagged
//          "NEW — needs owner review" (kit-audit §1).
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const SIZE: Record<ButtonSize, string> = {
  sm: "h-(--control-sm) px-(--sp-5)",
  md: "h-(--control-md) px-(--sp-6)",
  lg: "h-(--control-lg) px-(--sp-7)",
};

// REST box + label per variant (exact artboard strings), plus the §9.5/§9.6
// hover/active custom-prop hooks .kit-interactive reads.
const VARIANT: Record<
  ButtonVariant,
  { box: string; label: string; hoverVar: string; filled: boolean }
> = {
  primary: {
    box: "bg-accent [--kit-hover-bg:var(--color-accent-hover)]",
    label: "text-(--text-inverse)",
    hoverVar: "",
    filled: true,
  },
  secondary: {
    box: "bg-(--surface-page) border border-solid [border-color:var(--border-strong)] [--kit-hover-bg:var(--surface-hover)]",
    label: "[color:var(--text-primary)]",
    hoverVar: "",
    filled: false,
  },
  tertiary: {
    box: "[--kit-hover-bg:var(--surface-hover)]",
    label: "text-accent",
    hoverVar: "",
    filled: false,
  },
  destructive: {
    box: "bg-danger [--kit-hover-bg:var(--color-danger-hover)]",
    label: "text-(--text-inverse)",
    hoverVar: "",
    filled: true,
  },
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const v = VARIANT[variant];

  return (
    <button
      type="button"
      className={cn(
        "[font-synthesis:none] antialiased kit-interactive kit-focus-ring",
        "flex items-center justify-center gap-(--sp-3) rounded-sm",
        SIZE[size],
        v.box,
        className,
      )}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      {...props}
    >
      {loading && (
        <Spinner
          className={v.filled ? "[color:var(--text-inverse)]" : "text-accent"}
        />
      )}
      <span className={cn("font-ui font-(--weight-medium) text-sm/sm", v.label)}>
        {children}
      </span>
    </button>
  );
}
