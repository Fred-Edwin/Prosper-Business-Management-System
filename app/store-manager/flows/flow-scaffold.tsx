"use client";

// Shared chrome for the Store Manager / Canteen full-screen movement flows
// (Session 12, ADR-44 — composed from the kit; artboards 8XH-0 / 92M-0 /
// 9FE-0 superseded). <FlowHeader> at the top, a scrolling body, and a
// sticky submit bar pinned to the bottom of the shell's scroll region.
//
// The staff shell already owns the outer header + bottom nav; this
// scaffold is the flow *content*. The submit bar is sticky within the
// scroll region (not the shell's optional stickyActionBar slot, which the
// hub routes don't wire).

import * as React from "react";
import { useRouter } from "next/navigation";
import { FlowHeader, type FlowHeaderProps } from "@/components/kit/flow-header";
import { Button } from "@/components/kit/button";

export function FlowScaffold({
  title,
  direction,
  directionTone,
  submitLabel,
  submitDisabled,
  submitting,
  onSubmit,
  children,
}: {
  title: string;
  direction?: string;
  directionTone?: FlowHeaderProps["directionTone"];
  submitLabel: string;
  submitDisabled?: boolean;
  submitting?: boolean;
  onSubmit: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-col grow min-h-0">
      <FlowHeader
        title={title}
        direction={direction}
        directionTone={directionTone}
        onBack={() => router.back()}
        className="w-full"
      />
      <div className="flex flex-col grow min-h-0 gap-(--sp-5) p-(--sp-6)">
        {children}
      </div>
      <div className="sticky bottom-0 flex items-center shrink-0 px-(--sp-6) py-(--sp-4) bg-(--surface-page) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={submitDisabled}
          loading={submitting}
          onClick={onSubmit}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
