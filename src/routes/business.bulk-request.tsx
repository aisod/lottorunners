import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, MapPin, PackageCheck, Plus, Trash2, Truck, Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BusinessRequestStepper, PortalPageIntro, PortalSection, StatusPill } from "@/components/portal-primitives";
import { saveBusinessBulkDraft } from "@/lib/business-bulk-draft";

export const Route = createFileRoute("/business/bulk-request")({
  component: BusinessBulkRequestPage,
});

type StopRow = { id: string; address: string; notes: string };

function BusinessBulkRequestPage() {
  const navigate = useNavigate();
  const [batchName, setBatchName] = useState("Weekly pharmacy circuit");
  const [stops, setStops] = useState<StopRow[]>([
    { id: "1", address: "123 Independence Ave, Windhoek", notes: "Reception" },
    { id: "2", address: "Katatura Health Centre", notes: "Lab samples" },
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
    saveBusinessBulkDraft({
      batchName,
      stops: stops.map((s) => ({
        address: (s.address ?? "").trim() || "Address TBD",
        notes: (s.notes ?? "").trim(),
      })),
    });

    navigate({
      to: "/business/bulk-review",
    });
  };

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Bulk logistics"
        title="Bulk request"
        description="Choose the service, enter stops, and prepare the batch for dispatch."
      />

      <BusinessRequestStepper current="bulk-request" />

      <div className="grid gap-6 xl:grid-cols-[1.45fr,0.9fr]">
        <div className="space-y-6">
          <PortalSection title="Choose service type" description="Select the primary logistical task for this batch.">
            <div className="grid gap-3 md:grid-cols-3">
              <ServiceTile title="Errand" description="Personal tasks and utility runs." active />
              <ServiceTile title="Delivery" description="Courier services for parcels and documents." />
              <ServiceTile title="Truck" description="Freight and heavy item transport." icon={<Truck className="h-7 w-7" />} />
            </div>
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

          <PortalSection title="Stops builder" description="Create the route in the order the runner should complete it.">
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
          <PortalSection title="Schedule & team" description="Assign service speed and ownership.">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assign to team</label>
                <select className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2">
                  <option>Logistics Alpha · Windhoek Central</option>
                  <option>Relief Team B</option>
                  <option>Standard Courier Pool</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service speed</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" className="rounded-xl border border-primary bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                    Standard
                  </button>
                  <button type="button" className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted-foreground">
                    Express
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-primary" />
                Schedule recurring request
              </label>
            </div>
          </PortalSection>

          <PortalSection title="Request summary" description="A quick read before import and review.">
            <div className="space-y-3">
              <SummaryRow label="Stops entered" value={String(stops.length)} />
              <SummaryRow label="Est. fleet weight" value="-- kg" />
              <SummaryRow label="Selected team" value="Logistics Alpha" />
              <SummaryRow label="Recurring" value="Off" />
              <div className="border-t border-dashed border-border pt-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Estimated cost</p>
                  <p className="text-2xl font-black text-primary">N$ 0.00</p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Pricing updates after address validation.</p>
              </div>
            </div>
          </PortalSection>

          <div className="rounded-2xl border border-border bg-primary/90 p-5 text-primary-foreground shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4" />
              Efficient Namibia-wide coverage
            </div>
            <p className="mt-3 text-sm text-primary-foreground/85">Teams can switch between manual entry and spreadsheet import without leaving the business portal flow.</p>
          </div>
        </div>
      </div>

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
  icon,
}: {
  title: string;
  description: string;
  active?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
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
