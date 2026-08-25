import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, id, className, disabled, ...props }, ref) => {
    const input = (
      <div
        className={cn(
          "flex h-9 shrink-0 items-center rounded-sm border border-solid px-3",
          disabled
            ? "border-border-subtle bg-surface-subtle"
            : "border-border-strong bg-surface-page has-[input:focus]:border-[1.5px] has-[input:focus]:border-accent",
        )}
      >
        <input
          ref={ref}
          id={id}
          disabled={disabled}
          className={cn(
            "min-w-0 grow border-none bg-transparent font-ui text-sm/sm text-text-primary outline-none placeholder:text-text-tertiary disabled:text-text-disabled",
            className,
          )}
          {...props}
        />
      </div>
    );

    if (!label) return input;

    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="font-ui text-caption/caption font-medium uppercase tracking-[0.04em] text-text-secondary">
          {label}
        </label>
        {input}
      </div>
    );
  },
);
TextInput.displayName = "TextInput";
