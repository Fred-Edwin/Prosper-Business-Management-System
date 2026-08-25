import * as React from "react";

export function InstructionalBanner({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-surface-selected px-4 py-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent font-ui text-sm/sm font-semibold text-white">
        {step}
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-ui text-sm/sm font-semibold text-accent">{title}</p>
        <p className="font-ui text-caption/caption text-text-secondary">{description}</p>
      </div>
    </div>
  );
}
