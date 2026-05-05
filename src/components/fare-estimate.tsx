import { useApp } from "@/lib/store";
import { SERVICES } from "@/lib/services";
import { ERRAND_CATEGORIES } from "@/lib/errand-categories";
import { cn } from "@/lib/utils";
import logo from "@/assets/lotto-runners-logo.png";

export function FareEstimate() {
  const {
    selectedService,
    pickup,
    destination,
    buildEstimate,
    setStatus,
    errandCategory,
  } = useApp();

  if (!selectedService || !pickup || !destination) return null;
  const svc = SERVICES[selectedService];
  const cat = selectedService === "errand" && errandCategory ? ERRAND_CATEGORIES[errandCategory] : null;
  const est = buildEstimate();
  if (!est) return null;

  const distanceFee = Math.round(est.fare * 0.65);
  const platformFee = 5;
  const baseFare = est.fare - distanceFee - platformFee;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setStatus("selecting")}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-secondary"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="flex-1 text-center font-display text-lg font-bold text-primary">
          {cat?.label ?? svc.label}
        </h2>
        <div className="h-9 w-9" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <img src={logo} alt={cat?.label ?? svc.label} className="h-32 w-full object-contain" />
      </div>

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold">Schedule for</h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="flex flex-col items-center gap-1 rounded-2xl border-2 border-primary bg-secondary py-4 text-primary">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" />
            </svg>
            <span className="text-sm font-bold">Now</span>
            <span className="text-[11px] font-medium">Priority dispatch</span>
          </button>
          <button
            disabled
            className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card py-4 text-foreground opacity-70"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-sm font-bold">Later</span>
            <span className="text-[11px] text-muted-foreground">Coming soon</span>
          </button>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold">Fare Breakdown</h3>
        <div className="rounded-2xl border border-border bg-card p-4 text-sm">
          <Row label="Base Fare" value={`N$ ${baseFare}.00`} />
          <Row label={`Distance Fee (${est.distanceKm.toFixed(1)} km)`} value={`N$ ${distanceFee}.00`} />
          <Row label="Platform Fee" value={`N$ ${platformFee}.00`} />
          <div className="my-3 h-px bg-border" />
          <Row label={<span className="text-base font-semibold">Total</span>} value={<span className="text-lg font-bold text-primary">N$ {est.fare}.00</span>} />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="14" rx="2" /><path d="M16 14a2 2 0 1 1 0-4h6v4z" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="font-semibold">Wallet</div>
          <div className="text-xs text-muted-foreground">Balance: N$ 450.00</div>
        </div>
        <button className="text-sm font-semibold text-primary">Change</button>
      </div>

      <button
        onClick={() => setStatus("searching")}
        className={cn(
          "mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-[0_8px_20px_-8px_oklch(0.48_0.14_248/0.6)] transition-transform active:scale-[0.99]",
        )}
      >
        Confirm &amp; Request Runner
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
      <button
        onClick={() => useApp.getState().reset()}
        className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground"
      >
        Cancel
      </button>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
