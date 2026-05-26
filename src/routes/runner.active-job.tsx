import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Camera,
  Clock3,
  Layers3,
  LocateFixed,
  MessageCircle,
  Navigation,
  Package2,
  Phone,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LiveMapClient } from "@/components/live-map-client";
import { RunnerBottomNav } from "@/components/runner-bottom-nav";
import { Button } from "@/components/ui/button";
import { openPhoneCall, openPhoneSms } from "@/lib/contact-actions";
import {
  advanceRunnerJobStatus,
  getCurrentRunnerId,
  getRunnerActiveJob,
  setJobProofPhoto,
} from "@/lib/jobs-service";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useMarketplaceJob } from "@/lib/use-marketplace-job";
import { CARGO_PHOTO_SLOTS } from "@/lib/cargo-photos";
import { SERVICES } from "@/lib/services";
import type { MarketplaceJobStatus } from "@/lib/jobs-types";
import { useGeolocation } from "@/lib/use-geolocation";
import type { Runner } from "@/lib/types";

export const Route = createFileRoute("/runner/active-job")({
  validateSearch: (search: Record<string, unknown>) => ({
    jobId: typeof search.jobId === "string" ? search.jobId : "",
  }),
  component: RunnerActiveJobPage,
});

type RunnerPhase = "arrived" | "in-progress";

function marketplaceToPhase(status: MarketplaceJobStatus): RunnerPhase {
  return status === "in_progress" ? "in-progress" : "arrived";
}

interface PhaseCardConfig {
  label: string;
  value: string;
  icon: typeof Package2;
}

interface PhaseConfig {
  turnLabel: string;
  turnValue: string;
  primaryLabel: string;
  primaryAction: "progress" | "complete";
  cards: [PhaseCardConfig, PhaseCardConfig];
  showProof: boolean;
}

function RunnerActiveJobPage() {
  const navigate = useNavigate();
  const { jobId: searchJobId } = Route.useSearch();
  const runnerId = getCurrentRunnerId();
  const activeAssigned = runnerId ? getRunnerActiveJob(runnerId) : null;
  const resolvedJobId = searchJobId || activeAssigned?.id || "";
  const job = useMarketplaceJob(resolvedJobId);
  const geo = useGeolocation({ fallbackOnError: false, watch: true });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const userLocation = geo.location;
  const activeRunner: Runner | null =
    userLocation && runnerId
      ? {
          id: runnerId,
          name: job?.runnerName ?? "You",
          vehicle: job?.serviceType ?? "delivery",
          rating: 5,
          plate: "",
          position: userLocation,
          heading: 0,
        }
      : null;
  const [jobPhase, setJobPhase] = useState<RunnerPhase>("arrived");
  const proofUpload = useFileUpload(`job-proof/${resolvedJobId || "active"}`);
  const [showDestinationPreview, setShowDestinationPreview] = useState(false);

  useEffect(() => {
    if (!resolvedJobId) {
      navigate({ to: "/runner/dashboard", replace: true });
      return;
    }
    if (!job) return;
    if (job.status === "completed") {
      navigate({ to: "/runner/rate-customer", search: { jobId: job.id }, replace: true });
      return;
    }
    if (job.status === "pending" || job.status === "cancelled") {
      navigate({ to: "/runner/dashboard", replace: true });
      return;
    }
    setJobPhase(marketplaceToPhase(job.status));
  }, [job, navigate, resolvedJobId]);

  const pickup = job?.pickup ?? null;
  const destination = job?.dropoff ?? null;
  const mapFocus = showDestinationPreview
    ? destination ?? activeRunner?.position ?? userLocation
    : jobPhase === "in-progress"
      ? destination ?? activeRunner?.position ?? userLocation
      : pickup ?? activeRunner?.position ?? userLocation;

  const serviceLabel = job ? SERVICES[job.serviceType].label : "Active job";
  const cargoPhotos = job?.cargoPhotoUrls;
  const showCargoPhotos =
    job?.serviceType === "truck" &&
    cargoPhotos &&
    CARGO_PHOTO_SLOTS.some((slot) => Boolean(cargoPhotos[slot.id]));

  const phaseContent: PhaseConfig = ({
    arrived: {
      turnLabel: "AT PICKUP",
      turnValue: job?.pickupAddress ?? "Confirm handover",
      primaryLabel: "Start task",
      primaryAction: "progress",
      cards: [
        { label: "TASK", value: serviceLabel, icon: Package2 },
        { label: "NEXT STEP", value: "Collect and depart", icon: Clock3 },
      ],
      showProof: false,
    },
    "in-progress": {
      turnLabel: "NEXT STOP",
      turnValue: job?.dropoffAddress ?? "En route to drop-off",
      primaryLabel: "Complete job",
      primaryAction: "complete",
      cards: [
        { label: "TASK", value: serviceLabel, icon: Package2 },
        { label: "PROOF", value: proofUpload.remoteUrl ? "Photo ready" : "Add proof", icon: Camera },
      ],
      showProof: true,
    },
  } satisfies Record<RunnerPhase, PhaseConfig>)[jobPhase];

  const customerPhone = job?.customerPhone;

  const openCustomerChat = () => {
    if (!openPhoneSms(customerPhone)) {
      window.alert("Customer phone number is not available for this job.");
    }
  };

  const callCustomer = () => {
    if (!openPhoneCall(customerPhone)) {
      window.alert("Customer phone number is not available for this job.");
    }
  };

  const handlePrimaryAction = () => {
    if (!job || !runnerId) return;
    void (async () => {
      if (phaseContent.primaryAction === "progress") {
        const updated = await advanceRunnerJobStatus(job.id, runnerId);
        if (updated) setJobPhase(marketplaceToPhase(updated.status));
        return;
      }
      let current = job;
      while (current && current.status !== "completed") {
        const updated = await advanceRunnerJobStatus(current.id, runnerId);
        if (!updated || updated.status === current.status) break;
        current = updated;
      }
      navigate({ to: "/runner/rate-customer", search: { jobId: current?.id ?? job.id } });
    })();
  };

  if (!job) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-muted-foreground">
        Loading active job…
      </div>
    );
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0">
        <LiveMapClient
          userLocation={userLocation}
          runners={activeRunner ? [activeRunner] : []}
          pickup={pickup}
          destination={destination}
          activeRunner={activeRunner}
          followLocation={mapFocus}
        />

        {!userLocation && (
          <div className="absolute inset-0 z-[900] flex items-center justify-center bg-background/85 backdrop-blur-sm">
            <div className="text-center">
              <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
              <p className="text-sm font-medium">Loading active route map…</p>
              {geo.error ? <p className="mt-1 text-xs text-slate-500">{geo.error}</p> : null}
            </div>
          </div>
        )}
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-[800] border-b border-border/60 bg-background/95 px-5 py-3 shadow-sm backdrop-blur">
        <div className="pointer-events-auto mx-auto flex w-full max-w-xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <h1 className="text-[22px] font-semibold text-primary">Runner Dashboard</h1>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full text-muted-foreground opacity-50"
            aria-label="Notifications"
            disabled
            title="Notifications are not available yet"
          >
            <Bell className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="pointer-events-none absolute inset-x-5 top-20 z-[800] flex items-start justify-between gap-4">
        <div className="pointer-events-auto max-w-sm rounded-2xl border border-border/50 bg-white/90 p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
              <Navigation className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{phaseContent.turnLabel}</p>
              <h2 className="text-[22px] font-semibold leading-7 text-foreground">{phaseContent.turnValue}</h2>
            </div>
          </div>
        </div>
        <div className="pointer-events-auto flex flex-col gap-2">
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-primary shadow-md"
            aria-label="Center map on current phase"
            onClick={() => setShowDestinationPreview(false)}
          >
            <LocateFixed className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-primary shadow-md"
            aria-label={showDestinationPreview ? "Return to current phase map focus" : "Preview destination on map"}
            onClick={() => setShowDestinationPreview((current) => !current)}
          >
            <Layers3 className="h-5 w-5" />
          </button>
        </div>
      </div>

      <section className="pointer-events-auto fixed inset-x-0 bottom-16 z-[900] mx-auto w-full max-w-xl rounded-t-[28px] border-t border-border/50 bg-white shadow-[0_-4px_24px_-1px_rgba(0,0,0,0.15)]">
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-border/70" />
        <div className="space-y-4 px-6 pb-6 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                <User className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-[22px] font-semibold leading-7 text-foreground">{job.customerName}</h2>
                <p className="text-base text-muted-foreground">Order #{job.id.slice(-8)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CustomerQuickAction label="Chat" icon={MessageCircle} onClick={openCustomerChat} disabled={!customerPhone} />
              <CustomerQuickAction label="Call" icon={Phone} onClick={callCustomer} disabled={!customerPhone} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {phaseContent.cards.map((card) => (
              <PhaseMetricCard key={card.label} label={card.label} value={card.value} icon={card.icon} />
            ))}
          </div>

          {showCargoPhotos ? (
            <div className="space-y-2 rounded-xl border border-border/50 bg-muted/30 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Customer cargo photos
              </p>
              <div className="grid grid-cols-3 gap-2">
                {CARGO_PHOTO_SLOTS.map((slot) => {
                  const url = cargoPhotos?.[slot.id];
                  if (!url) return null;
                  return (
                    <div key={slot.id} className="overflow-hidden rounded-lg border border-border/40 bg-card">
                      <img src={url} alt={slot.label} className="aspect-square w-full object-cover" />
                      <p className="truncate px-1.5 py-1 text-center text-[10px] font-medium text-muted-foreground">
                        {slot.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {phaseContent.showProof ? (
            <div className="rounded-xl border border-border/50 bg-muted/40 px-4 py-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                capture="environment"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file || !job || !runnerId) return;
                  void proofUpload.upload(file).then((result) => {
                    if (result.ok) setJobProofPhoto(job.id, runnerId, result.publicUrl);
                  });
                }}
              />

              {proofUpload.previewUrl || job.proofPhotoUrl ? (
                <img
                  src={proofUpload.previewUrl ?? job.proofPhotoUrl}
                  alt="Delivery proof"
                  className="mb-3 max-h-40 w-full rounded-lg object-cover"
                />
              ) : null}

              <button
                type="button"
                disabled={proofUpload.uploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-between gap-3 text-left disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Proof</p>
                    <p className="text-sm font-semibold text-foreground">
                      {proofUpload.uploading
                        ? "Uploading…"
                        : proofUpload.remoteUrl || job.proofPhotoUrl
                          ? "Photo saved"
                          : "Add proof photo"}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-primary">
                  {proofUpload.remoteUrl || job.proofPhotoUrl ? "Change" : "Upload"}
                </span>
              </button>
              {proofUpload.error ? <p className="mt-2 text-sm text-destructive">{proofUpload.error}</p> : null}
            </div>
          ) : null}

          <Button
            className="h-16 w-full rounded-2xl bg-primary text-[22px] font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
            onClick={handlePrimaryAction}
          >
            {phaseContent.primaryLabel}
          </Button>
        </div>
      </section>

      <RunnerBottomNav active="active" />
    </div>
  );
}

function CustomerQuickAction({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof MessageCircle;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1 text-sm font-semibold text-primary transition hover:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary">
        <Icon className="h-5 w-5" />
      </div>
      {label}
    </button>
  );
}

function PhaseMetricCard({ label, value, icon: Icon }: PhaseCardConfig) {
  return (
    <div className="rounded-2xl border border-border/40 bg-secondary/60 p-4">
      <div className="mb-1 flex items-center gap-2 text-primary">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-semibold leading-6 text-foreground">{value}</p>
    </div>
  );
}
