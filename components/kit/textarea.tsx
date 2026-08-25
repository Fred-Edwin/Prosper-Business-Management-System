import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, id, className, disabled, rows = 3, ...props }, ref) => {
    const field = (
      <div
        className={cn(
          "flex rounded-sm border border-solid px-3 py-2",
          disabled
            ? "border-border-subtle bg-surface-subtle"
            : "border-border-strong bg-surface-page has-[textarea:focus]:border-[1.5px] has-[textarea:focus]:border-accent",
        )}
      >
        <textarea
          ref={ref}
          id={id}
          disabled={disabled}
          rows={rows}
          className={cn(
            "min-w-0 grow resize-none border-none bg-transparent font-ui text-sm/sm text-text-primary outline-none placeholder:text-text-tertiary disabled:text-text-disabled",
            className,
          )}
          {...props}
        />
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
Textarea.displayName = "Textarea";
