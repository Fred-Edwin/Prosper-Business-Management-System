import * as React from "react";

export interface MatchCardField {
  label: string;
  value: string;
}

export function MatchCard({
  title,
  badgeLabel,
  fields,
  actionLabel,
  onMatch,
}: {
  title: string;
  badgeLabel: string;
  fields: MatchCardField[];
  actionLabel: string;
  onMatch: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-solid border-border-subtle p-4">
      <div className="flex items-center justify-between">
        <p className="font-ui text-sm/sm font-semibold text-text-primary">{title}</p>
        <span className="flex h-5 items-center rounded-sm bg-surface-selected px-1.5 font-ui text-[10px] font-medium uppercase tracking-[0.04em] text-accent">
          {badgeLabel}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {fields.map((field) => (
          <p key={field.label} className="font-ui text-sm/sm text-text-secondary">
            {field.label}: {field.value}
          </p>
        ))}
      </div>
      <button
        type="button"
        onClick={onMatch}
        className="flex h-9 shrink-0 items-center justify-center rounded-sm bg-accent font-ui text-sm/sm font-semibold text-white outline-none hover:bg-accent-hover"
      >
        {actionLabel}
      </button>
    </div>
  );
}
