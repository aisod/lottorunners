import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface BottomSheetProps {
  children: ReactNode;
  className?: string;
  fullscreen?: boolean;
  /** Lift above the fixed customer tab bar (Home / Activity / Wallet / Profile). */
  aboveTabBar?: boolean;
}

export function BottomSheet({ children, className, fullscreen, aboveTabBar }: BottomSheetProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto fixed left-0 right-0 z-[1100] mx-auto w-full max-w-2xl rounded-t-3xl border-t border-border bg-card shadow-[var(--shadow-sheet)]",
        aboveTabBar
          ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
          : "bottom-0",
        "animate-in slide-in-from-bottom-4 duration-300",
        fullscreen && "top-0 max-w-none rounded-none border-t-0",
        className,
      )}
      style={{ background: "var(--gradient-sheet)" }}
    >
      <div className="mx-auto mt-2 mb-1 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
      <div
        className={cn(
          "px-4 pt-2 sm:px-5",
          aboveTabBar
            ? "pb-4"
            : "pb-[max(1rem,env(safe-area-inset-bottom,0px))]",
        )}
      >
        {children}
      </div>
    </div>
  );
}
