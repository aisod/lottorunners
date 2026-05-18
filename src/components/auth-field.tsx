import type { LucideIcon } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type AuthFieldProps = Omit<React.ComponentProps<"input">, "placeholder"> & {
  icon: LucideIcon;
  /** Visible placeholder and accessible label */
  label: string;
};

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ icon: Icon, label, className, id, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <div className="relative">
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <Icon
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary"
          aria-hidden
        />
        <input
          ref={ref}
          id={inputId}
          placeholder={label}
          className={cn(
            "flex h-12 w-full rounded-xl border border-neutral-200 bg-white pl-12 pr-4 text-base text-foreground shadow-none transition-colors",
            "placeholder:text-neutral-400",
            "focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

AuthField.displayName = "AuthField";
