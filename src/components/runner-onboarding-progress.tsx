import { cn } from "@/lib/utils";

type RunnerOnboardingStep =
  | "service-selection"
  | "documents"
  | "vehicle"
  | "banking"
  | "training"
  | "verification";

const STEPS: { id: RunnerOnboardingStep; label: string }[] = [
  { id: "service-selection", label: "Services" },
  { id: "documents", label: "Documents" },
  { id: "vehicle", label: "Vehicle" },
  { id: "banking", label: "Banking" },
  { id: "training", label: "Training" },
  { id: "verification", label: "Verification" },
];

export function RunnerOnboardingProgress({ current }: { current: RunnerOnboardingStep }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {STEPS.map((step, index) => {
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={step.id} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                  isCurrent && "border-primary bg-primary text-primary-foreground",
                  isDone && "border-primary bg-primary/15 text-primary",
                  !isCurrent && !isDone && "border-border bg-background text-muted-foreground",
                )}
              >
                {index + 1}
              </div>
              {index < STEPS.length - 1 ? <div className={cn("h-1 flex-1 rounded-full", index < currentIndex ? "bg-primary" : "bg-border")} /> : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {STEPS.map((step, index) => (
          <span key={step.id} className={cn(index === currentIndex && "text-primary")}>
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}
