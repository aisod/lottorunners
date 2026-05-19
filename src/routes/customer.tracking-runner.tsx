import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Phone, MessageCircle, ShieldCheck, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CustomerHeaderLogo } from "@/components/customer-header-logo";
import { BottomSheet } from "@/components/bottom-sheet";
import { LiveMapClient } from "@/components/live-map-client";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/lib/use-geolocation";
import { openPhoneCall, openPhoneSms } from "@/lib/contact-actions";
import { jobStatusLabel } from "@/lib/jobs-service";
import { useAssignedRunnerLocation } from "@/lib/use-assigned-runner-location";
import { useMarketplaceJob } from "@/lib/use-marketplace-job";
import { useCustomerApp } from "@/lib/customer-store";
import { SERVICES } from "@/lib/services";

export const Route = createFileRoute("/customer/tracking-runner")({
  component: CustomerTrackingRunnerPage,
});

function CustomerTrackingRunnerPage() {
  const navigate = useNavigate();
  const geo = useGeolocation({ fallbackOnError: false });
  const activeJobId = useCustomerApp((s) => s.activeJobId);
  const { userLocation, setUserLocation, pickup, destination } = useCustomerApp();
  const job = useMarketplaceJob(activeJobId);
  const { runner: assignedRunner, freshnessLabel, waitingForGps } = useAssignedRunnerLocation(job);
  const [completionReady, setCompletionReady] = useState(false);

  const mapPickup = pickup?.coord ?? job?.pickup ?? null;
  const mapDestination = destination?.coord ?? job?.dropoff ?? null;

  const followTarget = useMemo(() => {
    if (assignedRunner?.position) return assignedRunner.position;
    return mapDestination ?? mapPickup ?? userLocation ?? geo.location;
  }, [assignedRunner?.position, mapDestination, mapPickup, userLocation, geo.location]);

  useEffect(() => {
    if (geo.location && !userLocation) {
      setUserLocation(geo.location);
    }
  }, [geo.location, userLocation, setUserLocation]);

  useEffect(() => {
    if (!activeJobId) {
      navigate({ to: "/customer/home", replace: true });
    }
  }, [activeJobId, navigate]);

  useEffect(() => {
    if (!job) return;
    if (job.status === "completed") {
      navigate({ to: "/customer/rate-runner", replace: true });
      return;
    }
    setCompletionReady(job.status === "in_progress" || job.status === "arrived");
  }, [job, navigate]);

  const markComplete = () => {
    if (job?.status === "completed" || job?.status === "in_progress") {
      navigate({ to: "/customer/rate-runner" });
    }
  };

  const serviceLabel = job ? SERVICES[job.serviceType].label : "Service";
  const statusText = job ? jobStatusLabel(job.status) : "Runner en route";
  const runnerPhone = job?.runnerPhone;
  const hasAssignedRunner = Boolean(job?.runnerId || job?.runnerEmail);

  const messageRunner = () => {
    if (!openPhoneSms(runnerPhone)) {
      window.alert("Runner phone number is not available yet.");
    }
  };

  const callRunner = () => {
    if (!openPhoneCall(runnerPhone)) {
      window.alert("Runner phone number is not available yet.");
    }
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-background">
      <div className="absolute inset-0">
        <LiveMapClient
          userLocation={userLocation ?? geo.location}
          runners={assignedRunner ? [assignedRunner] : []}
          pickup={mapPickup}
          destination={mapDestination}
          activeRunner={assignedRunner}
          followLocation={followTarget}
        />
      </div>

      {!userLocation && !geo.location && geo.loading ? (
        <MapLoadingOverlay geoError={null} />
      ) : null}

      <header className="pointer-events-none absolute inset-x-0 top-0 z-[800] flex items-center justify-between bg-card/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="pointer-events-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/customer/home" })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-lg font-black uppercase tracking-wider text-primary">
            Lotto Runners
          </h1>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">LIVE</span>
          <CustomerHeaderLogo size="sm" />
        </div>
      </header>

      <div className="pointer-events-none absolute inset-x-4 top-20 z-[800] mx-auto w-auto max-w-3xl">
        <EtaSummaryCard
          distanceKm={job?.distanceKm}
          etaMin={job?.etaMin}
          freshnessLabel={freshnessLabel}
          waitingForGps={hasAssignedRunner && waitingForGps}
        />
      </div>

      <BottomSheet className="max-w-3xl">
        <div className="space-y-4">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-primary">{statusText}</p>
              <p className="text-xs text-muted-foreground">Task #{job?.id.slice(-8) ?? "—"}</p>
            </div>
            <div className="h-2 rounded-full bg-secondary">
              <div className="h-2 w-2/3 rounded-full bg-primary" />
            </div>
            {hasAssignedRunner && waitingForGps ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Waiting for your runner&apos;s live GPS signal…
              </p>
            ) : null}
            {freshnessLabel ? (
              <p className="mt-1 text-xs text-primary">{freshnessLabel}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-secondary" />
              <div>
                <p className="font-semibold">{job?.runnerName ?? "Your runner"}</p>
                <p className="text-sm text-muted-foreground">Lotto Runner • assigned</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                aria-label="Message runner"
                disabled={!runnerPhone}
                onClick={messageRunner}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Call runner"
                disabled={!runnerPhone}
                onClick={callRunner}
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-secondary/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Assigned task</p>
              <p className="text-sm font-semibold">{serviceLabel}</p>
            </div>
            <div className="rounded-xl border bg-secondary/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Pickup</p>
              <p className="text-sm font-semibold">{job?.pickupAddress ?? "Pickup set"}</p>
            </div>
          </div>

          <section
            className={`rounded-2xl border bg-card p-4 shadow-sm transition-all ${
              completionReady ? "border-primary ring-2 ring-primary/20" : "border-border"
            }`}
          >
            {completionReady ? (
              <p className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Your service should be complete — finish when you are ready.
              </p>
            ) : null}
            <p className="text-center text-sm text-muted-foreground">Tap when your service is completed</p>
            <Button
              className="mt-3 h-12 w-full text-base font-semibold"
              onClick={markComplete}
              disabled={!completionReady}
            >
              Mark job complete
            </Button>
          </section>

          <Button
            variant="outline"
            className="h-11 w-full gap-2 text-sm font-semibold"
            onClick={async () => {
              const url = window.location.href;
              try {
                if (navigator.share) {
                  await navigator.share({
                    title: "Lotto Runners — Live tracking",
                    text: "Track my Lotto Runners delivery live.",
                    url,
                  });
                  return;
                }
              } catch {
                /* user cancelled share sheet */
              }
              try {
                await navigator.clipboard.writeText(url);
                window.alert("Tracking link copied to clipboard.");
              } catch {
                window.alert(`Share this link:\n${url}`);
              }
            }}
          >
            <ShieldCheck className="h-4 w-4" />
            Share tracking link with family
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

function MapLoadingOverlay({ geoError }: { geoError: string | null }) {
  return (
    <div className="absolute inset-0 z-[900] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="text-center">
        <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-accent" />
        <p className="text-sm font-medium">Finding you on the map…</p>
        {geoError ? <p className="mt-1 text-xs text-muted-foreground">{geoError}</p> : null}
      </div>
    </div>
  );
}

function EtaSummaryCard({
  distanceKm,
  etaMin,
  freshnessLabel,
  waitingForGps,
}: {
  distanceKm?: number;
  etaMin?: number;
  freshnessLabel: string | null;
  waitingForGps: boolean;
}) {
  return (
    <div className="pointer-events-auto rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TimerIconBox />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Estimated arrival
            </p>
            <p className="text-xl font-bold">{etaMin != null ? `${etaMin} min` : "—"}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Distance</p>
          <p className="text-xl font-bold">{distanceKm != null ? `${distanceKm.toFixed(1)} km` : "—"}</p>
        </div>
      </div>
      {waitingForGps ? (
        <p className="mt-3 text-xs text-muted-foreground">Runner GPS not available yet — showing route only.</p>
      ) : freshnessLabel ? (
        <p className="mt-3 text-xs text-primary">{freshnessLabel}</p>
      ) : null}
    </div>
  );
}

function TimerIconBox() {
  return (
    <div className="rounded-lg bg-secondary p-2 text-primary">
      <Timer className="h-5 w-5" />
    </div>
  );
}
