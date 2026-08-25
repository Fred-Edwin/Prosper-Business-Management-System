import * as React from "react";
import { AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function TransferBanner({
  title,
  detail,
  onAccept,
  acceptLabel,
  onFlagVariance,
}: {
  title: string;
  detail: string;
  acceptLabel: string;
  onAccept: () => void;
  onFlagVariance: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-solid border-warning bg-warning-bg p-4">
      <div className="flex flex-col gap-1">
        <p className="font-ui text-sm/sm font-semibold text-warning">{title}</p>
        <p className="font-ui text-caption/caption text-text-secondary">{detail}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onAccept}
          className="flex h-9 grow items-center justify-center rounded-sm bg-success font-ui text-sm/sm font-semibold text-white outline-none hover:opacity-90"
        >
          {acceptLabel}
        </button>
        <button
          type="button"
          onClick={onFlagVariance}
          className="flex h-9 shrink-0 items-center justify-center rounded-sm border border-solid border-border-strong bg-surface-page px-6 font-ui text-sm/sm font-medium text-text-primary outline-none hover:bg-surface-hover"
        >
          Flag Variance
        </button>
      </div>
    </div>
  );
}

export function PurchaseDeliveryBanner({
  title,
  detail,
  onAccept,
  acceptLabel,
  onFlagVariance,
}: {
  title: string;
  detail: string;
  acceptLabel: string;
  onAccept: () => void;
  onFlagVariance: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-solid border-info bg-info-bg p-4">
      <div className="flex flex-col gap-1">
        <p className="font-ui text-sm/sm font-semibold text-info">{title}</p>
        <p className="font-ui text-caption/caption text-text-secondary">{detail}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onAccept}
          className="flex h-9 grow items-center justify-center rounded-sm bg-success font-ui text-sm/sm font-semibold text-white outline-none hover:opacity-90"
        >
          {acceptLabel}
        </button>
        <button
          type="button"
          onClick={onFlagVariance}
          className="flex h-9 shrink-0 items-center justify-center rounded-sm border border-solid border-border-strong bg-surface-page px-6 font-ui text-sm/sm font-medium text-text-primary outline-none hover:bg-surface-hover"
        >
          Flag Variance
        </button>
      </div>
    </div>
  );
}

export function CalculatedImpactBanner({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2 rounded-sm bg-warning-bg p-3", className)}>
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={1.5} aria-hidden />
      <p className="font-ui text-sm/sm text-warning">{children}</p>
    </div>
  );
}

export function InfoBanner({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2 rounded-sm bg-info-bg p-3", className)}>
      <Info className="mt-0.5 size-4 shrink-0 text-info" strokeWidth={1.5} aria-hidden />
      <p className="font-ui text-sm/sm text-info">{children}</p>
    </div>
  );
}
