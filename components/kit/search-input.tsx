import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="flex h-8 shrink-0 items-center gap-1.5 rounded-sm bg-surface-hover px-3">
        <Search className="size-3.5 shrink-0 text-text-tertiary" strokeWidth={1.5} aria-hidden />
        <input
          ref={ref}
          type="search"
          className={cn(
            "min-w-0 grow border-none bg-transparent font-ui text-sm/sm text-text-primary outline-none placeholder:text-text-tertiary",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
