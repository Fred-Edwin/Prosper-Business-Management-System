import * as React from "react";
import { ChevronLeft } from "lucide-react";

export function FlowHeader({
  title,
  direction,
  onBack,
}: {
  title: string;
  direction?: string;
  onBack: () => void;
}) {
  return (
    <header className="flex h-12 w-full shrink-0 items-center justify-between border-b border-solid border-border-subtle bg-surface-page px-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1.5 outline-none">
        <ChevronLeft className="size-5 text-text-primary" strokeWidth={1.5} aria-hidden />
        <span className="font-ui text-h2/h2 font-semibold text-text-primary">{title}</span>
      </button>
      {direction && <span className="font-ui text-sm/[16px] font-medium text-info">{direction}</span>}
    </header>
  );
}
