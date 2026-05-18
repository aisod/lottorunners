import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessRequestStepper, PortalPageIntro, PortalSection, StatusPill } from "@/components/portal-primitives";
import { loadBusinessBulkDraft } from "@/lib/business-bulk-draft";

export const Route = createFileRoute("/business/bulk-review")({
  component: BusinessBulkReviewPage,
});

function BusinessBulkReviewPage() {
  const navigate = useNavigate();
  const draft = loadBusinessBulkDraft();

  const batchName = draft?.batchName ?? "Untitled batch";
  const stops = draft?.stops?.length
    ? draft.stops
    : [
        { address: "123 Independence Ave, Windhoek", notes: "Reception" },
        { address: "Katatura Health Centre", notes: "Lab samples" },
      ];

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Bulk logistics"
        title="Review bulk request"
        description="Confirm stops before dispatching to the fleet queue."
      />

      <BusinessRequestStepper current="bulk-review" />

      <div className="grid gap-6 xl:grid-cols-[1.35fr,0.9fr]">
        <PortalSection
          title={batchName}
          description={`${stops.length} stop${stops.length === 1 ? "" : "s"}${draft?.fromImport ? " · Imported file" : ""}`}
        >
          <ol className="space-y-3">
            {stops.map((stop, index) => (
              <li key={`${index}-${stop.address}`} className="flex gap-3 rounded-2xl border border-border bg-white/85 px-4 py-4 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">{stop.address}</p>
                  {stop.notes ? <p className="text-muted-foreground">{stop.notes}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </PortalSection>

        <PortalSection title="Dispatch summary" description="Final check before sending to the fleet queue.">
          <div className="space-y-3">
            <SummaryRow label="Input source" value={draft?.fromImport ? "Spreadsheet" : "Manual entry"} />
            <SummaryRow label="Stops" value={String(stops.length)} />
            <SummaryRow label="Assigned team" value="Logistics Alpha" />
            <SummaryRow label="Service speed" value="Standard" />
            <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-sm font-semibold">Ready for dispatch</p>
              </div>
              <p className="mt-2 text-sm text-primary-foreground/85">Submitting keeps the flow prototype-friendly and returns to the dashboard.</p>
            </div>
          </div>
        </PortalSection>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Prototype: submit actions stay local and return to the business dashboard.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" asChild>
            <Link to="/business/bulk-request">Edit stops</Link>
          </Button>
          <Button type="button" onClick={() => navigate({ to: "/business/dashboard" })} className="gap-2">
            <Send className="h-4 w-4" />
            Submit batch
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/10 px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <StatusPill tone="primary">{value}</StatusPill>
    </div>
  );
}
