import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BusinessRequestStepper, PortalPageIntro, PortalSection, StatusPill } from "@/components/portal-primitives";
import { createJobsFromBusinessBulk } from "@/lib/business-jobs";
import { getCurrentBusinessId } from "@/lib/jobs-service";
import { loadBusinessBulkDraft, saveBusinessBulkDraft } from "@/lib/business-bulk-draft";
import { AddressSearchInput } from "@/components/address-search-input";
import { SERVICES } from "@/lib/services";

export const Route = createFileRoute("/business/bulk-review")({
  component: BusinessBulkReviewPage,
});

function BusinessBulkReviewPage() {
  const navigate = useNavigate();
  const draft = loadBusinessBulkDraft();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [batchSubmitted, setBatchSubmitted] = useState(false);
  const [pickupAddress, setPickupAddress] = useState(() => draft?.pickupAddress?.trim() ?? "");

  const batchName = draft?.batchName ?? "Untitled batch";
  const stops = draft?.stops?.filter((s) => s.address.trim()) ?? [];
  const serviceType = draft?.serviceType ?? "delivery";
  const serviceLabel = SERVICES[serviceType].label;

  const submitBatch = async () => {
    if (submitting || batchSubmitted) return;
    setError(null);
    const businessId = getCurrentBusinessId();
    if (!businessId) {
      navigate({ to: "/customer/signin" });
      return;
    }
    if (!draft) {
      setError("Draft expired. Go back and enter your stops again.");
      return;
    }

    const payload = { ...draft, pickupAddress: pickupAddress.trim() };
    saveBusinessBulkDraft(payload);

    setSubmitting(true);
    try {
      const result = await createJobsFromBusinessBulk(payload, businessId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccessCount(result.jobs.length);
      setBatchSubmitted(true);
      window.setTimeout(() => {
        navigate({ to: "/business/dashboard" });
      }, 1200);
    } finally {
      setSubmitting(false);
    }
  };

  if (!draft || stops.length === 0) {
    return (
      <div className="space-y-6">
        <PortalPageIntro
          eyebrow="Bulk logistics"
          title="Review bulk request"
          description="No draft found. Start a new batch from the request builder."
        />
        <Button asChild>
          <Link to="/business/bulk-request">Back to bulk request</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Bulk logistics"
        title="Review bulk request"
        description="Confirm stops before posting jobs to the marketplace."
      />

      <BusinessRequestStepper current="bulk-review" />

      <div className="grid gap-6 xl:grid-cols-[1.35fr,0.9fr]">
        <PortalSection
          title={batchName}
          description={`${stops.length} stop${stops.length === 1 ? "" : "s"}${draft.fromImport ? " · Imported file" : ""}`}
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

        <PortalSection title="Dispatch summary" description="Each stop becomes one marketplace job for runners.">
          <div className="space-y-3">
            <SummaryRow label="Service" value={serviceLabel} />
            {!pickupAddress ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pickup origin (required)
                </label>
                <input
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Dispatch warehouse or office address"
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2"
                />
                <AddressSearchInput near={null} field="pickup" onPick={(r) => setPickupAddress(r.shortLabel)} />
              </div>
            ) : (
              <SummaryRow label="Pickup origin" value={pickupAddress} />
            )}
            <SummaryRow label="Input source" value={draft.fromImport ? "Spreadsheet" : "Manual entry"} />
            <SummaryRow label="Jobs to create" value={String(stops.length)} />
            <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-sm font-semibold">Ready for dispatch</p>
              </div>
              <p className="mt-2 text-sm text-primary-foreground/85">
                Submitting geocodes addresses and posts {stops.length} pending job{stops.length === 1 ? "" : "s"} to
                Supabase.
              </p>
            </div>
          </div>
        </PortalSection>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {successCount != null ? (
        <p className="text-sm font-semibold text-primary">
          {successCount} job{successCount === 1 ? "" : "s"} posted — returning to dashboard…
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Approved runners can accept jobs from their dashboard.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" asChild disabled={submitting}>
            <Link to="/business/bulk-request">Edit stops</Link>
          </Button>
          <Button
            type="button"
            onClick={submitBatch}
            disabled={submitting || batchSubmitted || !pickupAddress}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Posting jobs…" : "Submit batch"}
          </Button>
        </div>
      </div>
      {!pickupAddress ? (
        <p className="text-sm text-destructive">Pickup origin is required — edit stops to add it.</p>
      ) : null}
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
