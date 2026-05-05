import { useState } from "react";
import { useApp } from "@/lib/store";
import { ERRAND_CATEGORIES, ERRAND_CATEGORY_ORDER } from "@/lib/errand-categories";

const CAT_ICONS: Record<string, React.ReactNode> = {
  personal_shopper: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" />
      <path d="M2.5 3h2l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  ),
  delivery: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 16-9 5-9-5V8l9-5 9 5z" /><path d="M3.3 7 12 12l8.7-5M12 22V12" />
    </svg>
  ),
  queue_sitting: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2h14M5 22h14M7 2v6l5 4-5 4v6M17 2v6l-5 4 5 4v6" />
    </svg>
  ),
  documents: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="14" y2="17" />
    </svg>
  ),
  special_runs: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2" />
    </svg>
  ),
  other: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
};

export function ErrandCategoryPicker() {
  const { setErrandCategory, setSelectedService, reset } = useApp();
  const [q, setQ] = useState("");

  const filtered = ERRAND_CATEGORY_ORDER.filter((id) => {
    const c = ERRAND_CATEGORIES[id];
    const s = q.toLowerCase().trim();
    if (!s) return true;
    return c.label.toLowerCase().includes(s) || c.description.toLowerCase().includes(s);
  });

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => {
            setErrandCategory(null);
            setSelectedService(null);
            reset();
          }}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-secondary"
          aria-label="Back"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="flex-1 text-center font-display text-lg font-bold text-primary">Errand Services</h2>
        <div className="h-9 w-9" />
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-border bg-card px-4">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search services..."
          className="w-full bg-transparent py-3 text-sm focus:outline-none"
        />
      </div>

      <div className="mb-3">
        <h3 className="text-base font-bold">What do you need?</h3>
        <p className="text-sm text-muted-foreground">Select a specific errand type below.</p>
      </div>

      <div className="space-y-2.5">
        {filtered.map((id) => {
          const c = ERRAND_CATEGORIES[id];
          return (
            <button
              key={id}
              onClick={() => {
                setErrandCategory(id);
                useApp.setState({ status: "selecting" });
              }}
              className="flex w-full items-start gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                {CAT_ICONS[id] ?? CAT_ICONS.other}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold leading-tight">{c.label}</div>
                <div className="mt-1 text-sm leading-snug text-muted-foreground">{c.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
