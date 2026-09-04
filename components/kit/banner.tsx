// Verbatim REST transcription of Paper artboard "Component Kit — Banners & Cards"
// (6SB-0): "Transfer Banner" (6SG-0, amber), "Purchase Delivery Banner (info)"
// (9Q9-0, blue), "Transfer Banner — Flagged" (9QL-0). Layout unchanged.
//
// Session 10 rewire:
//   - the two actions are the kit <Button> — Accept is a success/info filled
//     button (variant="primary" with the fill + hover overridden via
//     --kit-hover-bg to the new --color-success-hover / --color-info-hover
//     tokens), Flag is variant="secondary". §9.5/§9.7/§9.10 from one place;
//     no more hard-coded `text-white`.
//   - flagged: actions removed AND a muted "Flagged — awaiting admin" status line
//     shown (component-states.md §2 C22 — was only hiding the actions).
//   - container role="region" with an accessible name (it's a persistent pinned
//     banner with actions).
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

type BannerTone = "warning" | "info";

interface BannerProps {
  tone: BannerTone;
  title: string;
  detail: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  onFlag?: () => void;
  flagged?: boolean;
  /** Text shown in the flagged state. */
  flaggedLabel?: string;
  className?: string;
}

const TONE: Record<
  BannerTone,
  { box: string; heading: string; primaryFill: string }
> = {
  warning: {
    box: "bg-warning-bg border-warning",
    heading: "text-warning",
    // Accept on a Transfer banner is green (success) per the artboard.
    primaryFill:
      "bg-success [--kit-hover-bg:var(--color-success-hover)] text-(--text-inverse)",
  },
  info: {
    box: "bg-info-bg border-info",
    heading: "text-info",
    primaryFill:
      "bg-info [--kit-hover-bg:var(--color-info-hover)] text-(--text-inverse)",
  },
};

function Banner({
  tone,
  title,
  detail,
  primaryLabel,
  onPrimary,
  onFlag,
  flagged = false,
  flaggedLabel = "Flagged — awaiting admin review",
  className,
}: BannerProps) {
  const t = TONE[tone];
  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        "[font-synthesis:none] flex flex-col p-(--sp-6) rounded-md gap-(--sp-5) border border-solid antialiased",
        t.box,
        flagged && "opacity-[0.7]",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-[2px]">
          <div className={cn("font-ui font-(--weight-semibold) text-sm/sm", t.heading)}>
            {title}
          </div>
          <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
            {detail}
          </div>
        </div>
      </div>
      {flagged ? (
        <div className="font-ui font-(--weight-medium) [color:var(--text-secondary)] text-caption/micro">
          {flaggedLabel}
        </div>
      ) : (
        <div className="flex items-center gap-(--sp-4)">
          <Button
            variant="primary"
            onClick={onPrimary}
            className={cn("grow", t.primaryFill)}
          >
            {primaryLabel}
          </Button>
          {/* Session 16: the Flag Variance action is the two-phase
              TRANSFER variance path (ADR-39). The delivery banners
              (PurchaseDeliveryBanner) deliberately omit `onFlag` — a
              purchase_payment row has no transfer to flag — so an
              unconditional button rendered a control that silently did
              nothing. Render it only when a handler is wired. Every
              existing caller that wants Flag passes `onFlag`, so this is
              strictly additive. */}
          {onFlag && (
            <Button variant="secondary" onClick={onFlag}>
              Flag Variance
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export type TransferBannerProps = Omit<BannerProps, "tone">;

export function TransferBanner(props: TransferBannerProps) {
  return <Banner tone="warning" {...props} />;
}

export function PurchaseDeliveryBanner(props: TransferBannerProps) {
  return <Banner tone="info" {...props} />;
}
