import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type CustomerShellWidth = "sm" | "md" | "lg" | "xl" | "full";

const WIDTH_CLASS: Record<CustomerShellWidth, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
  full: "max-w-none",
};

type CustomerPageShellProps = {
  children: ReactNode;
  width?: CustomerShellWidth;
  /** Centered auth-style card on muted desktop background */
  variant?: "default" | "auth" | "plain";
  className?: string;
  /** Extra bottom padding for fixed tab bar */
  tabBar?: boolean;
};

export function CustomerPageShell({
  children,
  width = "md",
  variant = "default",
  className,
  tabBar = false,
}: CustomerPageShellProps) {
  const widthClass = WIDTH_CLASS[width];

  if (variant === "auth") {
    return (
      <div
        className={cn(
          "flex min-h-dvh w-full flex-col px-4 py-8 sm:px-6 md:[background:var(--gradient-auth)]",
          className,
          tabBar && "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]",
        )}
      >
        <div className={cn("mx-auto flex w-full flex-1 flex-col justify-center py-4", widthClass)}>{children}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-dvh w-full bg-background",
        variant === "plain" ? "" : "md:bg-muted/20",
        className,
        // Applied last so tab-bar clearance is not overridden by page-level padding classes.
        tabBar && "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]",
      )}
    >
      <div className={cn("mx-auto w-full min-w-0 px-4 sm:px-6", widthClass)}>{children}</div>
    </div>
  );
}

export function getShellWidthClass(width: CustomerShellWidth = "md"): string {
  return cn("mx-auto w-full", WIDTH_CLASS[width]);
}

type CustomerFixedFooterProps = {
  children: ReactNode;
  width?: CustomerShellWidth;
  className?: string;
};

/** Fixed bottom bar aligned to the same max-width as page content. */
export function CustomerFixedFooter({ children, width = "md", className }: CustomerFixedFooterProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto w-full min-w-0 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:px-6",
          WIDTH_CLASS[width],
        )}
      >
        {children}
      </div>
    </div>
  );
}

type CustomerStickyHeaderProps = {
  children: ReactNode;
  width?: CustomerShellWidth;
  className?: string;
  bleed?: boolean;
};

export function CustomerStickyHeader({ children, width = "md", className, bleed }: CustomerStickyHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        bleed && "-mx-4 sm:-mx-6",
        className,
      )}
    >
      <div className={cn("mx-auto flex h-16 w-full items-center justify-between gap-2 px-4 sm:px-6", WIDTH_CLASS[width])}>
        {children}
      </div>
    </header>
  );
}
