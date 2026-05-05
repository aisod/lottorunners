import { SERVICE_ORDER, SERVICES } from "@/lib/services";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ServiceType } from "@/lib/types";

const ICONS: Record<ServiceType, React.ReactNode> = {
  errand: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1.5" />
      <circle cx="18" cy="21" r="1.5" />
      <path d="M2.5 3h2l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  ),
  ride: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17h14M6.5 12 8 7h8l1.5 5M5 17v3M19 17v3" />
      <rect x="4" y="12" width="16" height="6" rx="1.5" />
      <circle cx="8" cy="17" r="1" fill="currentColor" />
      <circle cx="16" cy="17" r="1" fill="currentColor" />
    </svg>
  ),
  delivery: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 16-9 5-9-5V8l9-5 9 5z" />
      <path d="M3.3 7 12 12l8.7-5M12 22V12" />
    </svg>
  ),
  truck: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 18V6H2v12h2" />
      <path d="M14 8h4l4 4v6h-2" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  ),
};

export function ServiceSelector() {
  const { selectedService, setSelectedService, setStatus, pickup, setPickup, userLocation } = useApp();

  const choose = (id: ServiceType) => {
    setSelectedService(id);
    setStatus(id === "errand" ? "errand_category" : "selecting");
  };

  return (
    <div>
      <div className="-mx-1 flex items-stretch gap-2">
        {SERVICE_ORDER.map((id) => {
          const svc = SERVICES[id];
          const active = selectedService === id;
          return (
            <button
              key={id}
              onClick={() => choose(id)}
              className={cn(
                "group flex flex-1 flex-col items-center gap-2 rounded-2xl py-4 transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-[0_8px_20px_-8px_oklch(0.48_0.14_248/0.6)]"
                  : "bg-secondary text-primary hover:bg-secondary/70",
              )}
            >
              <div className="flex h-7 items-center justify-center">{ICONS[id]}</div>
              <span className="text-[11px] font-bold uppercase tracking-wider">{svc.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => {
          if (userLocation) setPickup({ coord: userLocation, label: "Home — 123 Independence Ave, Windhoek" });
        }}
        className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-secondary/40"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold leading-tight">{pickup?.label.startsWith("Home") ? "Home" : "Home"}</div>
          <div className="truncate text-xs text-muted-foreground">123 Independence Ave, Windhoek</div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted-foreground">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
