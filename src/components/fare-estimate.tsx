import { useApp } from "@/lib/store";
import { SERVICES } from "@/lib/services";
import { ERRAND_CATEGORIES } from "@/lib/errand-categories";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/types";

const PAYMENTS: { id: PaymentMethod; label: string; icon: string; sub: string }[] = [
  { id: "momo", label: "MTC MoMo", icon: "📱", sub: "•••• 4421" },
  { id: "card", label: "Card", icon: "💳", sub: "Visa •••• 1183" },
  { id: "cash", label: "Cash", icon: "💵", sub: "Pay the runner" },
];

export function FareEstimate() {
  const {
    selectedService,
    pickup,
    destination,
    paymentMethod,
    setPaymentMethod,
    buildEstimate,
    setStatus,
    errandCategory,
  } = useApp();

  if (!selectedService || !pickup || !destination) return null;
  const svc = SERVICES[selectedService];
  const cat = selectedService === "errand" && errandCategory ? ERRAND_CATEGORIES[errandCategory] : null;
  const est = buildEstimate();
  if (!est) return null;

  const headline = est.range ? (
    <div className="mt-1 flex items-baseline gap-1">
      <span className="text-3xl font-bold tracking-tight">N$ {est.range.low}</span>
      <span className="text-xl font-semibold opacity-70">–</span>
      <span className="text-3xl font-bold tracking-tight">{est.range.high}</span>
    </div>
  ) : (
    <div className="mt-1 text-3xl font-bold tracking-tight">N$ {est.fare}</div>
  );

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setStatus("selecting")}
          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-medium hover:bg-secondary"
        >
          ←
        </button>
        <h2 className="font-display text-lg font-bold">Confirm your trip</h2>
      </div>

      <div
        className="rounded-2xl p-4 text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider opacity-80">
              {cat?.label ?? svc.label}
            </div>
            {headline}
            {est.range && (
              <div className="mt-1 text-[11px] opacity-80">{est.range.basis}</div>
            )}
          </div>
          <div className="text-5xl">{cat?.icon ?? svc.icon}</div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-white/10 p-2">
            <div className="opacity-70">Distance</div>
            <div className="font-semibold">{est.distanceKm.toFixed(1)} km</div>
          </div>
          <div className="rounded-lg bg-white/10 p-2">
            <div className="opacity-70">ETA</div>
            <div className="font-semibold">{est.etaMin} min</div>
          </div>
          <div className="rounded-lg bg-white/10 p-2">
            <div className="opacity-70">Pickup in</div>
            <div className="font-semibold">~{svc.etaMin} min</div>
          </div>
        </div>
        {est.range && (
          <p className="mt-3 rounded-lg bg-white/10 p-2 text-[11px] leading-relaxed opacity-90">
            Final price is settled after the runner finishes — it will land between
            <span className="font-semibold"> N$ {est.range.low} </span>and
            <span className="font-semibold"> N$ {est.range.high}</span>.
          </p>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Payment
        </div>
        <div className="space-y-1.5">
          {PAYMENTS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPaymentMethod(p.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
                paymentMethod === p.id
                  ? "border-accent bg-accent/10"
                  : "border-border bg-card hover:bg-secondary/50",
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-xl">
                {p.icon}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{p.label}</div>
                <div className="text-xs text-muted-foreground">{p.sub}</div>
              </div>
              <div
                className={cn(
                  "h-5 w-5 rounded-full border-2",
                  paymentMethod === p.id ? "border-accent bg-accent" : "border-border",
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setStatus("searching")}
        className="mt-4 w-full rounded-xl bg-accent py-3.5 text-base font-bold text-accent-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.01] active:scale-[0.99]"
      >
        Confirm {svc.label}
      </button>
    </div>
  );
}
