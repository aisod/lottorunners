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
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LiveMapClient } from "@/components/live-map-client";
import { RunnerBottomNav } from "@/components/runner-bottom-nav";
import { Button } from "@/components/ui/button";
import { advanceRunnerJobStatus, getCurrentRunnerId, getRunnerActiveJob } from "@/lib/jobs-service";
import { useMarketplaceJob } from "@/lib/use-marketplace-job";
import { SERVICES } from "@/lib/services";
import type { MarketplaceJobStatus } from "@/lib/jobs-types";
import { useGeolocation } from "@/lib/use-geolocation";
import { useSimulatedRunners } from "@/lib/use-simulated-runners";

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
  const geo = useGeolocation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const userLocation = geo.location;
  const nearbyRunners = useSimulatedRunners(userLocation, 1);
  const activeRunner = nearbyRunners[0] ?? null;
  const [jobPhase, setJobPhase] = useState<RunnerPhase>("arrived");
  const [proofPhotoName, setProofPhotoName] = useState<string | null>(null);
  const [showDestinationPreview, setShowDestinationPreview] = useState(false);

  useEffect(() => {
    if (!resolvedJobId) {
      navigate({ to: "/runner/dashboard", replace: true });
      return;
    }
    if (!job) return;
    if (job.status === "completed") {
      navigate({ to: "/runner/rate-customer", replace: true });
      return;
    }
    if (job.status === "pending" || job.status === "cancelled") {
      navigate({ to: "/runner/dashboard", replace: true });
      return;
    }
    setJobPhase(marketplaceToPhase(job.status));
  }, [job, navigate, resolvedJobId]);

  const pickup = job?.pickup ?? (userLocation ? { lat: userLocation.lat + 0.008, lng: userLocation.lng - 0.005 } : null);
  const destination =
    job?.dropoff ?? (userLocation ? { lat: userLocation.lat + 0.015, lng: userLocation.lng + 0.006 } : null);
  const mapFocus = showDestinationPreview
    ? destination ?? activeRunner?.position ?? userLocation
    : jobPhase === "in-progress"
      ? destination ?? activeRunner?.position ?? userLocation
      : pickup ?? activeRunner?.position ?? userLocation;

  const serviceLabel = job ? SERVICES[job.serviceType].label : "Active job";

  const phaseContent: Record<RunnerPhase, PhaseConfig> = {
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
        { label: "PROOF", value: proofPhotoName ? "Photo ready" : "Add proof", icon: Camera },
      ],
      showProof: true,
    },
  }[jobPhase];

  const openCustomerChat = () => {
    if (typeof window === "undefined") return;
    window.alert(`Message ${job?.customerName ?? "customer"} (chat coming soon).`);
  };

  const handlePrimaryAction = () => {
    if (!job || !runnerId) return;
    if (phaseContent.primaryAction === "progress") {
      const updated = advanceRunnerJobStatus(job.id, runnerId);
      if (updated) setJobPhase(marketplaceToPhase(updated.status));
      return;
    }
    let current = job;
    while (current && current.status !== "completed") {
      const updated = advanceRunnerJobStatus(current.id, runnerId);
      if (!updated || updated.status === current.status) break;
      current = updated;
    }
    navigate({ to: "/runner/rate-customer" });
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
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-primary/10"
            aria-label="Notifications"
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
            <CustomerQuickAction label="Chat" icon={MessageCircle} onClick={openCustomerChat} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {phaseContent.cards.map((card) => (
              <PhaseMetricCard key={card.label} label={card.label} value={card.value} icon={card.icon} />
            ))}
          </div>

          {phaseContent.showProof ? (
            <div className="rounded-xl border border-border/50 bg-muted/40 px-4 py-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => setProofPhotoName(event.target.files?.[0]?.name ?? null)}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Proof</p>
                    <p className="text-sm font-semibold text-foreground">{proofPhotoName ? proofPhotoName : "Add proof photo"}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-primary">{proofPhotoName ? "Change" : "Upload"}</span>
              </button>
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
}: {
  icon: typeof MessageCircle;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 text-sm font-semibold text-primary transition hover:scale-[0.98]"
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
