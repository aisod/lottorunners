import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface BottomSheetProps {
  children: ReactNode;
  className?: string;
  fullscreen?: boolean;
}

export function BottomSheet({ children, className, fullscreen }: BottomSheetProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto fixed bottom-0 left-0 right-0 z-[1000] mx-auto w-full max-w-xl rounded-t-3xl border-t border-border bg-card shadow-[var(--shadow-sheet)]",
        "animate-in slide-in-from-bottom-4 duration-300",
        fullscreen && "top-0 max-w-xl rounded-none border-t-0",
        className,
      )}
      style={{ background: "var(--gradient-sheet)" }}
    >
      <div className="mx-auto mt-2 mb-1 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
      <div className="px-5 pb-24 pt-2">{children}</div>
    </div>
  );
}
