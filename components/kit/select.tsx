import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, id, className, disabled, children, ...props }, ref) => {
    const field = (
      <div
        className={cn(
          "flex h-9 shrink-0 items-center justify-between rounded-sm border border-solid px-3",
          disabled
            ? "border-border-subtle bg-surface-subtle"
            : "border-border-strong bg-surface-page has-[select:focus]:border-[1.5px] has-[select:focus]:border-accent",
        )}
      >
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          className={cn(
            "min-w-0 grow appearance-none border-none bg-transparent font-ui text-sm/sm text-text-primary outline-none disabled:text-text-disabled",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="size-3.5 shrink-0 text-text-tertiary" strokeWidth={1.5} aria-hidden />
      </div>
    );

    if (!label) return field;

    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="font-ui text-caption/caption font-medium uppercase tracking-[0.04em] text-text-secondary">
          {label}
        </label>
        {field}
      </div>
    );
  },
);
Select.displayName = "Select";
