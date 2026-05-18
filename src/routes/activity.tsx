import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCustomerApp } from "@/lib/customer-store";
import { SERVICES } from "@/lib/services";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { CustomerPageShell } from "@/components/customer-page-shell";

export const Route = createFileRoute("/activity")({
  beforeLoad: () => {
    throw redirect({ to: "/customer/activity" });
  },
});

export function CustomerActivityPage() {
  const history = useCustomerApp((s) => s.history);
  return (
    <CustomerPageShell width="md" variant="plain" tabBar className="pb-24">
      <header className="sticky top-0 z-10 -mx-4 flex items-center gap-2 border-b border-border bg-card px-4 py-3 sm:-mx-6 sm:px-6">
        <Link to="/customer/home" className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-secondary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </Link>
        <h1 className="flex-1 text-center font-display text-lg font-bold text-primary">Activity</h1>
        <div className="h-9 w-9" />
      </header>

      <div className="p-4">
        {history.length === 0 ? (
          <div className="mt-20 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-3xl">🗺️</div>
            <h2 className="font-semibold">No trips yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your completed errands and rides will appear here.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {history.map((t) => {
              const svc = SERVICES[t.service];
              return (
                <li key={t.id} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-xl">{svc.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{svc.label}</span>
                        <span className="font-bold text-primary">N$ {t.fare}</span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{t.pickupLabel} → {t.destinationLabel}</div>
                      {t.scheduledAt ? (
                        <p className="mt-1 text-[11px] font-medium text-primary">
                          Scheduled: {new Date(t.scheduledAt).toLocaleString()}
                        </p>
                      ) : null}
                      <div className="mt-1 text-[11px] text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <BottomTabBar />
    </CustomerPageShell>
  );
}

