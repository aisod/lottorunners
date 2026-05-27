import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, MapPin, PackageCheck, Plus, Trash2, Truck, Upload } from "lucide-react";
import { useState } from "react";
import { AddressSearchInput } from "@/components/address-search-input";
import { Button } from "@/components/ui/button";
import { BusinessRequestStepper, PortalPageIntro, PortalSection, StatusPill } from "@/components/portal-primitives";
import { saveBusinessBulkDraft } from "@/lib/business-bulk-draft";
import { SERVICES } from "@/lib/services";
import type { ServiceType } from "@/lib/types";

export const Route = createFileRoute("/business/bulk-request")({
  component: BusinessBulkRequestPage,
});

type StopRow = { id: string; address: string; notes: string };

function BusinessBulkRequestPage() {
  const navigate = useNavigate();
  const [batchName, setBatchName] = useState("Weekly pharmacy circuit");
  const [pickupAddress, setPickupAddress] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("delivery");
  const [formError, setFormError] = useState<string | null>(null);
  const [stops, setStops] = useState<StopRow[]>([
    { id: "1", address: "", notes: "" },
  ]);

  const addStop = () => {
    setStops((s) => [...s, { id: crypto.randomUUID(), address: "", notes: "" }]);
  };

  const updateStop = (id: string, field: keyof Omit<StopRow, "id">, value: string) => {
    setStops((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const removeStop = (id: string) => {
    setStops((rows) => rows.filter((r) => r.id !== id));
  };

  const continueToReview = () => {
    setFormError(null);
    const trimmedPickup = pickupAddress.trim();
    const validStops = stops.filter((s) => s.address.trim().length >= 3);

    if (!trimmedPickup) {
      setFormError("Enter a pickup / dispatch origin address.");
      return;
    }
    if (validStops.length === 0) {
      setFormError("Add at least one stop with a full address (3+ characters).");
      return;
    }

    saveBusinessBulkDraft({
      batchName: batchName.trim() || "Business batch",
      pickupAddress: trimmedPickup,
      serviceType,
      stops: validStops.map((s) => ({
        address: s.address.trim(),
        notes: s.notes.trim(),
      })),
    });

    navigate({ to: "/business/bulk-review" });
  };

  const estimatedTotal = stops.filter((s) => s.address.trim()).length * SERVICES[serviceType].baseFare;

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Bulk logistics"
        title="Bulk request"
        description="Choose the service, set your pickup origin, enter stops, and prepare the batch for dispatch."
      />

      <BusinessRequestStepper current="bulk-request" />

      <div className="grid gap-6 xl:grid-cols-[1.45fr,0.9fr]">
        <div className="space-y-6">
          <PortalSection title="Choose service type" description="Select the primary logistical task for this batch.">
            <div className="grid gap-3 md:grid-cols-3">
              <ServiceTile
                title="Errand"
                description="Personal tasks and utility runs."
                active={serviceType === "errand"}
                onClick={() => setServiceType("errand")}
              />
              <ServiceTile
                title="Delivery"
                description="Courier services for parcels and documents."
                active={serviceType === "delivery"}
                onClick={() => setServiceType("delivery")}
              />
              <ServiceTile
                title="Truck"
                description="Freight and heavy item transport."
                active={serviceType === "truck"}
                onClick={() => setServiceType("truck")}
                icon={<Truck className="h-7 w-7" />}
              />
            </div>
          </PortalSection>

          <PortalSection
            title="Pickup origin"
            description="Where runners collect items before each drop-off stop."
          >
            <input
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="e.g. 123 Independence Ave, Windhoek"
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2"
            />
            <AddressSearchInput
              near={null}
              field="pickup"
              className="mt-2"
              onPick={(r) => setPickupAddress(r.shortLabel)}
            />
          </PortalSection>

          <PortalSection
            title="Import stops"
            description="Upload a spreadsheet or continue with manual entry in the builder below."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link to="/business/bulk-import" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Import spreadsheet
                </Link>
              </Button>
            }
          >
            <p className="text-sm text-muted-foreground">
              CSV import is best for larger batches. Manual stops can be added in the builder without leaving this page.
            </p>
          </PortalSection>

          <PortalSection title="Stops builder" description="Create drop-off stops in the order runners should complete them.">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="batch-name">
                  Batch name
                </label>
                <input
                  id="batch-name"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2"
                />
              </div>

              <div className="space-y-3">
                {stops.map((stop, index) => (
                  <div key={stop.id} className="rounded-2xl border border-border bg-white/85 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <p className="font-semibold">Stop {index + 1}</p>
                      </div>
                      {stops.length > 1 ? (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeStop(stop.id)} aria-label="Remove stop">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-4 grid gap-3">
                      <input
                        value={stop.address}
                        onChange={(e) => updateStop(stop.id, "address", e.target.value)}
                        placeholder="Full address or landmark"
                        className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2"
                      />
                      <input
                        value={stop.notes}
                        onChange={(e) => updateStop(stop.id, "notes", e.target.value)}
                        placeholder="Gate code, contact on site, or drop-off note"
                        className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button type="button" variant="outline" className="w-full gap-2 border-dashed" onClick={addStop}>
                <Plus className="h-4 w-4" />
                Add stop
              </Button>
            </div>
          </PortalSection>
        </div>

        <div className="space-y-6">
          <PortalSection title="Dispatch options" description="Optional service speed and team assignment (coming soon).">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Team assignment</label>
                <select
                  disabled
                  title="Team assignment is not available yet"
                  className="mt-2 h-11 w-full cursor-not-allowed rounded-xl border border-border bg-muted/50 px-4 text-sm text-muted-foreground"
                >
                  <option>Coming soon</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service speed</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled
                    title="Express scheduling is not available yet"
                    className="cursor-not-allowed rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted-foreground opacity-60"
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Express scheduling is not available yet"
                    className="cursor-not-allowed rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted-foreground opacity-60"
                  >
                    Express
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-sm opacity-60">
                <input type="checkbox" disabled className="h-4 w-4 accent-primary" title="Recurring requests are not available yet" />
                Schedule recurring request (coming soon)
              </label>
            </div>
          </PortalSection>

          <PortalSection title="Request summary" description="A quick read before import and review.">
            <div className="space-y-3">
              <SummaryRow label="Stops entered" value={String(stops.filter((s) => s.address.trim()).length)} />
              <SummaryRow label="Service" value={SERVICES[serviceType].label} />
              <SummaryRow label="Pickup set" value={pickupAddress.trim() ? "Yes" : "No"} />
              <div className="border-t border-dashed border-border pt-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Estimated cost</p>
                  <p className="text-2xl font-black text-primary">N$ {estimatedTotal.toFixed(2)}</p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Final fare per stop is calculated at dispatch from distance.</p>
              </div>
            </div>
          </PortalSection>

          <div className="rounded-2xl border border-border bg-primary/90 p-5 text-primary-foreground shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4" />
              Shared marketplace dispatch
            </div>
            <p className="mt-3 text-sm text-primary-foreground/85">
              Each stop becomes a real job in marketplace_jobs for approved runners to accept.
            </p>
          </div>
        </div>
      </div>

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" asChild>
          <Link to="/business/dashboard">Cancel</Link>
        </Button>
        <Button type="button" onClick={continueToReview}>
          Continue to review
        </Button>
      </div>
    </div>
  );
}

function ServiceTile({
  title,
  description,
  active = false,
  onClick,
  icon,
}: {
  title: string;
  description: string;
  active?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border-2 p-5 text-left transition ${active ? "border-primary bg-primary/10" : "border-border bg-white/80 hover:border-primary/40"}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary">
        {icon ?? <PackageCheck className="h-6 w-6" />}
      </div>
      <p className={`mt-4 font-bold ${active ? "text-primary" : ""}`}>{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {active ? (
        <div className="mt-4">
          <StatusPill tone="primary">Selected</StatusPill>
        </div>
      ) : null}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
