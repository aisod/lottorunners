import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { FileText, Hourglass, Pill, Receipt, Search, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";
import { CustomerRouteStopsCard, CustomerRouteStopsHeroSection } from "@/components/customer-route-stops-card";
import { CustomerFlowHeader } from "@/components/customer-flow-header";
import { CustomerPageShell } from "@/components/customer-page-shell";
import {
  CHOOSE_ERRAND_TYPE_DESCRIPTIONS,
  CHOOSE_ERRAND_TYPE_LABELS,
  CHOOSE_ERRAND_TYPE_ORDER,
  ERRAND_CATEGORIES,
  type ErrandCategoryId,
} from "@/lib/errand-categories";
import { goBackOrFallback } from "@/lib/customer-navigation";
import { isValidRouteStop } from "@/lib/geocode-address";
import { useCustomerApp } from "@/lib/customer-store";
import { cn } from "@/lib/utils";

const CARD_ICONS: Record<ErrandCategoryId, typeof ShoppingCart> = {
  personal_shopper: ShoppingCart,
  queue_sitting: Hourglass,
  documents: FileText,
  pharmacy_runs: Pill,
  special_runs: Receipt,
  delivery: ShoppingCart,
  other: ShoppingCart,
};

export const Route = createFileRoute("/customer/choose-errand-type")({
  component: CustomerChooseErrandTypePage,
});

function CustomerChooseErrandTypePage() {
  const navigate = useNavigate();
  const router = useRouter();
  const {
    setErrandCategory,
    setSelectedService,
    setStatus,
    pickup,
    destination,
    setPickup,
    setDestination,
    restoreHomeUi,
    userLocation,
  } = useCustomerApp();
  const [query, setQuery] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = (query ?? "").toLowerCase().trim();
    if (!q) return CHOOSE_ERRAND_TYPE_ORDER;
    return CHOOSE_ERRAND_TYPE_ORDER.filter((id) => {
      const c = ERRAND_CATEGORIES[id];
      const title = CHOOSE_ERRAND_TYPE_LABELS[id] ?? c.label;
      const desc = CHOOSE_ERRAND_TYPE_DESCRIPTIONS[id] ?? c.description;
      return title.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
    });
  }, [query]);

  const pickCategory = (id: ErrandCategoryId) => {
    if (!isValidRouteStop(pickup)) {
      setLocationError("Set a pickup using search above or a pin on the home map.");
      return;
    }
    if (!isValidRouteStop(destination)) {
      setLocationError("Set a destination using search above or a pin on the home map.");
      return;
    }
    setLocationError(null);
    setSelectedService("errand");
    setErrandCategory(id);
    setStatus("errand_category");
    navigate({ to: "/customer/errand-details" });
  };

  return (
    <CustomerPageShell width="md" variant="plain" className="pb-8">
      <CustomerFlowHeader
        title="Errand Services"
        bleed
        onBack={() => {
          restoreHomeUi();
          goBackOrFallback(router.history, () => navigate({ to: "/customer/home" }));
        }}
      />

      <main className="flex flex-col gap-6 pb-8 pt-6">
        <CustomerRouteStopsHeroSection>
          <CustomerRouteStopsCard
            near={userLocation}
            pickupLabel={pickup?.label ?? "Set pickup location"}
            destinationLabel={destination?.label ?? "Set destination location"}
            onPickPickup={(r) => setPickup({ label: r.shortLabel, coord: r.coord })}
            onPickDestination={(r) => setDestination({ label: r.shortLabel, coord: r.coord })}
          />
        </CustomerRouteStopsHeroSection>

        {locationError ? <p className="text-sm text-destructive">{locationError}</p> : null}

        <section>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search services..."
              aria-label="Search services"
              className="h-12 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-sm shadow-sm outline-none ring-primary/30 transition placeholder:text-muted-foreground focus:border-primary focus:ring-2"
            />
          </div>
        </section>

        <section>
          <h2 className="mb-1 text-2xl font-bold tracking-tight text-foreground">What do you need?</h2>
          <p className="text-base text-muted-foreground">Select a specific errand type below.</p>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((id) => {
            const c = ERRAND_CATEGORIES[id];
            const title = CHOOSE_ERRAND_TYPE_LABELS[id] ?? c.label;
            const description = CHOOSE_ERRAND_TYPE_DESCRIPTIONS[id] ?? c.description;
            const Icon = CARD_ICONS[id] ?? ShoppingCart;
            const wide = id === "special_runs";
            return (
              <button
                key={id}
                type="button"
                onClick={() => pickCategory(id)}
                className={cn(
                  "group relative flex w-full items-start gap-4 overflow-hidden rounded-xl border border-border/30 bg-card p-4 text-left shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition duration-200 hover:border-primary/40 hover:shadow-[0_8px_24px_rgba(0,93,152,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] md:col-span-1",
                  wide && "md:col-span-2",
                )}
              >
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-bl-full bg-primary/15 opacity-50 transition-transform group-hover:scale-110" />
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary shadow-sm transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-7 w-7 text-primary group-hover:text-primary-foreground" strokeWidth={1.75} />
                </div>
                <div className="relative z-10 min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary">{title}</h3>
                  <p className="mt-1 text-sm leading-snug text-muted-foreground">{description}</p>
                </div>
              </button>
            );
          })}
        </section>
      </main>
    </CustomerPageShell>
  );
}
