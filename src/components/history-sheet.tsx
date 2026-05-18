import { useCustomerApp } from "@/lib/customer-store";
import { SERVICES } from "@/lib/services";

export function HistorySheet({ onClose }: { onClose: () => void }) {
  const history = useCustomerApp((s) => s.history);

  return (
    <div className="absolute inset-0 z-[1100] flex flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium hover:bg-secondary"
        >
          ←
        </button>
        <h1 className="text-lg font-bold">Your trips</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {history.length === 0 ? (
          <div className="mt-20 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-3xl">
              🗺️
            </div>
            <h2 className="font-semibold">No trips yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your completed errands and rides will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {history.map((t) => {
              const svc = SERVICES[t.service];
              return (
                <li
                  key={t.id}
                  className="rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-xl">
                      {svc.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{svc.label}</span>
                        <span className="font-bold">N$ {t.fare}</span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {t.pickupLabel} → {t.destinationLabel}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{new Date(t.createdAt).toLocaleString()}</span>
                        {t.rating && <span>· ⭐ {t.rating}</span>}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
