import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover disabled:bg-gray-200 disabled:text-text-disabled",
  secondary:
    "bg-surface-page text-text-primary border border-solid border-border-strong hover:bg-surface-hover disabled:opacity-60",
  tertiary: "bg-transparent text-accent hover:bg-surface-hover disabled:text-text-disabled",
  destructive: "bg-danger text-white hover:opacity-90 disabled:bg-gray-200 disabled:text-text-disabled",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-sm px-6 font-ui text-sm/sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none",
          variantClasses[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
