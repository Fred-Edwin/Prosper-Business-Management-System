// Verbatim transcription of Paper artboard "Component Kit — Banners & Cards" (6SB-0):
//   "Transfer Banner" (6SG-0)              — amber, bg-warning-bg / border-warning
//   "Purchase Delivery Banner (info)" (9Q9-0) — blue,  bg-info-bg / border-info
//   "Transfer Banner — Flagged" (9QL-0)   — opacity-[0.7] + the actions row `hidden`
//
// Same markup in all three:
//   container: flex flex-col p-(--sp-6) rounded-md gap-(--sp-5) border border-solid
//   heading  : font-(--weight-semibold) text-sm/sm in the semantic color (text-warning /
//              text-info); detail line font-ui [color:var(--text-secondary)] text-caption/micro
//   actions  : flex items-center gap-(--sp-4); primary action `h-36 grow rounded-sm` with
//              `bg-success` (transfer) or `bg-info` (purchase-delivery), label
//              font-(--weight-semibold) text-white text-sm/sm; secondary "Flag Variance"
//              `h-36 px-(--sp-6) rounded-sm bg-(--surface-page) border border-solid
//              [border-color:var(--border-strong)]`.
//
// milestone-1-plan.md §4.7 requires both named variants — exported here as
// <TransferBanner> and <PurchaseDeliveryBanner> wrapping a shared <Banner>.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type BannerTone = "warning" | "info";

interface BannerProps {
  tone: BannerTone;
  title: string;
  detail: string;
  /** Label for the primary (accept/match) action. */
  primaryLabel?: string;
  onPrimary?: () => void;
  onFlag?: () => void;
  /** Flagged state: actions removed, whole banner dimmed. */
  flagged?: boolean;
  className?: string;
}

const TONE: Record<BannerTone, { box: string; heading: string; primaryBg: string }> = {
  warning: {
    box: "bg-warning-bg border-warning",
    heading: "text-warning",
    primaryBg: "bg-success",
  },
  info: {
    box: "bg-info-bg border-info",
    heading: "text-info",
    primaryBg: "bg-info",
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
  className,
}: BannerProps) {
  const t = TONE[tone];
  return (
    <div
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
      <div className={cn("flex items-center gap-(--sp-4)", flagged && "hidden")}>
        <button
          type="button"
          onClick={onPrimary}
          className={cn(
            "flex items-center justify-center h-[36px] grow rounded-sm kit-interactive kit-focus-ring",
            t.primaryBg,
          )}
        >
          <span className="font-ui font-(--weight-semibold) text-white text-sm/sm">
            {primaryLabel}
          </span>
        </button>
        <button
          type="button"
          onClick={onFlag}
          className="flex items-center justify-center h-[36px] px-(--sp-6) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-interactive kit-focus-ring"
        >
          <span className="font-ui font-(--weight-medium) w-max shrink-0 [color:var(--text-primary)] text-sm/sm">
            Flag Variance
          </span>
        </button>
      </div>
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
