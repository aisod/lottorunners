import { useApp } from "@/lib/store";
import { ERRAND_CATEGORIES, ERRAND_CATEGORY_ORDER } from "@/lib/errand-categories";
import { cn } from "@/lib/utils";

export function ErrandCategoryPicker() {
  const { errandCategory, setErrandCategory, setSelectedService, reset } = useApp();

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => {
            setErrandCategory(null);
            setSelectedService(null);
          }}
          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-medium hover:bg-secondary"
        >
          ←
        </button>
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">Choose your errand</h2>
          <p className="text-xs text-muted-foreground">Pick a service so we send the right runner.</p>
        </div>
      </div>

      <div className="space-y-2">
        {ERRAND_CATEGORY_ORDER.map((id) => {
          const c = ERRAND_CATEGORIES[id];
          const active = errandCategory === id;
          return (
            <button
              key={id}
              onClick={() => setErrandCategory(id)}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl border-2 p-3 text-left transition-all",
                active
                  ? "border-accent bg-accent/10 shadow-[var(--shadow-glow)]"
                  : "border-border bg-card hover:border-primary/30 hover:bg-secondary/50",
              )}
            >
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl",
                  active ? "bg-accent" : "bg-secondary",
                )}
              >
                {c.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold leading-tight">{c.label}</div>
                  <div className="text-[11px] font-medium text-muted-foreground">
                    from N$ {c.pricing.minRange}
                  </div>
                </div>
                <div className="mt-0.5 text-xs font-medium text-accent">{c.tagline}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {c.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        disabled={!errandCategory}
        onClick={() => useApp.setState({ status: "selecting" })}
        className={cn(
          "mt-4 w-full rounded-xl py-3.5 text-base font-semibold transition-all",
          errandCategory
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "cursor-not-allowed bg-muted text-muted-foreground",
        )}
      >
        Continue
      </button>

      <button
        onClick={() => {
          reset();
        }}
        className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground"
      >
        Cancel
      </button>
    </div>
  );
}
