import { SERVICE_ORDER, SERVICES } from "@/lib/services";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ServiceSelector() {
  const { selectedService, setSelectedService, setStatus } = useApp();

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-2xl font-bold tracking-tight">What do you need?</h2>
        <span className="text-xs font-medium text-muted-foreground">Tap to choose</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SERVICE_ORDER.map((id) => {
          const svc = SERVICES[id];
          const active = selectedService === id;
          return (
            <button
              key={id}
              onClick={() => setSelectedService(id)}
              className={cn(
                "group relative flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all",
                active
                  ? "border-accent bg-accent/10 shadow-[var(--shadow-glow)]"
                  : "border-border bg-card hover:border-primary/30 hover:bg-secondary/50",
              )}
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-transform",
                  active ? "scale-110 bg-accent" : "bg-secondary",
                )}
              >
                {svc.icon}
              </div>
              <div>
                <div className="font-semibold leading-tight">{svc.label}</div>
                <div className="text-xs text-muted-foreground">{svc.tagline}</div>
              </div>
              <div className="mt-1 text-xs font-medium text-muted-foreground">
                from <span className="text-foreground">N$ {svc.baseFare}</span> · ~{svc.etaMin} min
              </div>
            </button>
          );
        })}
      </div>

      <button
        disabled={!selectedService}
        onClick={() => setStatus(selectedService === "errand" ? "errand_category" : "selecting")}
        className={cn(
          "mt-5 w-full rounded-xl py-3.5 text-base font-semibold transition-all",
          selectedService
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "cursor-not-allowed bg-muted text-muted-foreground",
        )}
      >
        Continue
      </button>
    </div>
  );
}
