import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BriefcaseBusiness, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LiveMapClient } from "@/components/live-map-client";
import { RunnerBottomNav } from "@/components/runner-bottom-nav";
import { RunnerProfileAvatar } from "@/components/runner-profile-avatar";
import { Button } from "@/components/ui/button";
import { formatMapZoneLabel } from "@/lib/geo-utils";
import {
  countRunnerHiddenPendingJobs,
  getCurrentRunnerId,
  listJobsForRunner,
  subscribeToJobs,
} from "@/lib/jobs-service";
import { countPendingDemandNear } from "@/lib/runner-location-service";
import { getRunnerEarningsSummary } from "@/lib/runner-earnings";
import { useNearbyRunners } from "@/lib/use-nearby-runners";
import { useRunnerJobFeed } from "@/lib/use-marketplace-job";
import { useRunnerOnboardingStatus } from "@/lib/use-runner-onboarding-status";
import {
  getRunnerBankDetails,
  getRunnerOnline,
  maskAccountNumber,
  setRunnerOnline,
} from "@/lib/runner-workflow";
import { SERVICES } from "@/lib/services";
import { setStoredRunnerStage } from "@/lib/store";
import { waitForGeolocationFix } from "@/lib/geolocation-utils";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useGeolocation } from "@/lib/use-geolocation";
import type { Runner } from "@/lib/types";

export const Route = createFileRoute("/runner/dashboard")({
  component: RunnerDashboardPage,
});

function RunnerDashboardPage() {
  const navigate = useNavigate();
  const [online, setOnlineState] = useState(false);
  const geo = useGeolocation({ fallbackOnError: false, watch: true });
  const geoRef = useRef(geo);
  geoRef.current = geo;
  const [locationGateError, setLocationGateError] = useState<string | null>(null);
  const runnerStatus = useRunnerOnboardingStatus();
  const canReceiveJobs = runnerStatus === "approved";
  const isPending = runnerStatus === "pending_verification";
  const isRejected = runnerStatus === "rejected";

  const runnerId = getCurrentRunnerId();
  const { jobs: pendingJobs, syncError: jobsSyncError } = useRunnerJobFeed();
  const hiddenByServiceFilter = countRunnerHiddenPendingJobs(runnerId);
  const nextJob = pendingJobs[0] ?? null;
  const recentCompleted = runnerId
    ? listJobsForRunner(runnerId)
        .filter((job) => job.status === "completed")
        .slice(0, 3)
    : [];

  const setOnline = async (next: boolean) => {
    setLocationGateError(null);
    if (next) {
      const permission = await waitForGeolocationFix(() => geoRef.current);
      if (!permission.ok) {
        setLocationGateError(permission.error);
        return;
      }
    }
    setOnlineState(next);
    setRunnerOnline(next);
    if (next && canReceiveJobs && nextJob) {
      navigate({ to: "/runner/incoming-job-alert", search: { jobId: nextJob.id } });
    }
  };

  const userLocation = geo.location;
  const earnings = getRunnerEarningsSummary(runnerId ?? undefined);
  const { runners: nearbyRunners } = useNearbyRunners({
    center: userLocation,
    excludeRunnerId: runnerId,
    enabled: Boolean(userLocation),
  });
  const [demandNearby, setDemandNearby] = useState(0);

  useEffect(() => {
    if (!userLocation) {
      setDemandNearby(0);
      return;
    }
    const refreshDemand = () => setDemandNearby(countPendingDemandNear(userLocation));
    refreshDemand();
    return subscribeToJobs(refreshDemand);
  }, [userLocation?.lat, userLocation?.lng]);
  const selfMarker: Runner | null =
    userLocation && runnerId
      ? {
          id: runnerId,
          name: "You",
          vehicle: "delivery",
          rating: 5,
          plate: "",
          position: userLocation,
          heading: 0,
        }
      : null;
  const mapRunners = selfMarker ? [selfMarker, ...nearbyRunners] : nearbyRunners;
  const zoneLabel = formatMapZoneLabel(userLocation);
  const payoutDetails = getRunnerBankDetails();

  useEffect(() => {
    setStoredRunnerStage("dashboard");
    setOnlineState(getRunnerOnline());
  }, []);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="fixed inset-x-0 top-0 z-20 border-b bg-background">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <RunnerProfileAvatar size="md" />
            <h1 className="truncate text-base font-bold text-primary sm:text-lg">Runner Dashboard</h1>
          </div>
          <Button variant="ghost" asChild className="h-9 shrink-0 px-2 text-sm font-semibold text-primary sm:px-3">
            <Link to="/logout">Sign out</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-5 pb-28 pt-20">
        {isPending ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <VerificationPendingBanner navigate={navigate} />
            </div>
          </section>
        ) : null}

        {locationGateError || geo.error ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {locationGateError ?? geo.error}
            {isSupabaseConfigured() ? null : (
              <p className="mt-2 text-xs opacity-80">Live GPS sharing requires Lovable Cloud / Supabase.</p>
            )}
          </section>
        ) : null}

        {jobsSyncError && canReceiveJobs ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Could not load customer requests from the server.</p>
            <p className="mt-1 text-xs opacity-90">{jobsSyncError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => window.location.reload()}
            >
              Refresh page
            </Button>
          </section>
        ) : null}

        {canReceiveJobs && hiddenByServiceFilter > 0 && !jobsSyncError ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">
              {hiddenByServiceFilter} request{hiddenByServiceFilter === 1 ? "" : "s"} waiting — not in your offered
              services
            </p>
            <p className="mt-1 text-xs opacity-90">
              Business and customer jobs only appear when you offer that service type (e.g. Delivery). Turn on the
              matching services in Runner settings.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => navigate({ to: "/runner/settings" })}
            >
              Update offered services
            </Button>
          </section>
        ) : null}

        {isRejected ? (
          <section className="rounded-3xl border border-destructive/30 bg-destructive/5 p-5 shadow-sm">
            <div className="flex gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <h2 className="text-lg font-bold text-destructive">Application not approved</h2>
                <p className="mt-1 text-sm text-destructive/90">
                  Your runner profile was rejected. You cannot go online or accept jobs. Contact runner support if you
                  need help or want to reapply.
                </p>
                <Button
                  variant="link"
                  className="mt-2 h-auto p-0 text-destructive"
                  onClick={() => navigate({ to: "/runner/onboarding/verification" })}
                >
                  View verification status
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Shift status</p>
              <h2 className="mt-1 text-2xl font-black text-primary">
                {!canReceiveJobs ? "Awaiting approval" : online ? "Ready to receive jobs" : "Offline and unavailable"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {!canReceiveJobs
                  ? "You will be able to go online and accept jobs after your runner profile is approved."
                  : online
                    ? "Incoming job alerts, route guidance, and active trip tools will appear here while you are online."
                    : "Go online when you are ready to receive errand, taxi, delivery, or truck requests."}
              </p>
            </div>

            <div className="inline-flex rounded-full border bg-card p-1 shadow-sm">
              <button
                type="button"
                disabled={!canReceiveJobs}
                onClick={() => setOnline(true)}
                className={`rounded-full px-6 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${online ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"}`}
              >
                Go Online
              </button>
              <button
                type="button"
                disabled={!canReceiveJobs}
                onClick={() => setOnline(false)}
                className={`rounded-full px-6 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${!online ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
              >
                Offline
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-12">
          <section className="relative overflow-hidden rounded-3xl border bg-card p-5 md:col-span-7">
            <div className="absolute right-3 top-3 text-primary/10">
              <WalletGlyph />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Today&apos;s earnings</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <p className="text-3xl font-bold text-primary">N$ {earnings.today.toFixed(2)}</p>
              {earnings.tripCount > 0 ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {earnings.tripCount} completed {earnings.tripCount === 1 ? "job" : "jobs"}
                </span>
              ) : null}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-3">
              <Stat label="This week" value={`N$ ${earnings.week.toFixed(2)}`} />
              <Stat label="This month" value={`N$ ${earnings.month.toFixed(2)}`} />
              <Stat label="Avg per trip" value={`N$ ${earnings.avgPerTrip.toFixed(2)}`} highlight />
            </div>
            <Button variant="link" className="mt-4 h-auto p-0 text-primary" onClick={() => navigate({ to: "/runner/earnings" })}>
              Open earnings and payouts
            </Button>
          </section>

          <section className="rounded-3xl border bg-primary p-5 text-primary-foreground shadow md:col-span-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">Incoming request</p>
            {nextJob ? (
              <>
                <h3 className="mt-2 text-xl font-black leading-tight">{SERVICES[nextJob.serviceType].label}</h3>
                <p className="mt-2 text-sm opacity-90">
                  {nextJob.customerName} · {nextJob.pickupAddress}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm opacity-90">No pending customer requests right now. Stay online to receive new jobs.</p>
            )}
            {nextJob ? (
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <InfoTile label="Estimated pay" value={`N$ ${nextJob.estimatedFare}`} dark />
                <InfoTile label="Distance" value={`${nextJob.distanceKm.toFixed(1)} km`} dark />
              </div>
            ) : null}
            <Button
              className="mt-4 w-full bg-background text-primary hover:bg-background/90"
              disabled={!canReceiveJobs || !online || !nextJob}
              onClick={() => nextJob && navigate({ to: "/runner/incoming-job-alert", search: { jobId: nextJob.id } })}
            >
              Review request
            </Button>
          </section>

          <section className="overflow-hidden rounded-3xl border bg-card md:col-span-12">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-primary">Runner map</h2>
                <p className="text-xs text-muted-foreground">Live nearby activity around your current zone.</p>
              </div>
              <span className="text-xs text-muted-foreground">{zoneLabel}</span>
            </div>
            <div className="relative h-80">
              <LiveMapClient
                userLocation={userLocation}
                runners={mapRunners}
                pickup={null}
                destination={null}
                activeRunner={null}
                followLocation={userLocation}
              />

              {!userLocation && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-accent" />
                    <p className="text-sm font-medium">Loading runner map…</p>
                    {geo.error ? <p className="mt-1 text-xs text-muted-foreground">{geo.error}</p> : null}
                  </div>
                </div>
              )}

              <div className="pointer-events-none absolute inset-x-4 top-4 z-10 grid gap-3 md:grid-cols-3">
                <OverlayBadge
                  title="Open requests"
                  value={demandNearby > 0 ? `${demandNearby} nearby` : "None nearby"}
                />
                <OverlayBadge title="Nearby runners" value={`${nearbyRunners.length} online`} />
                <OverlayBadge title="Next payout" value={`Fri -> ${maskAccountNumber(payoutDetails.accountNumber)}`} />
              </div>
            </div>
          </section>

          <section className="md:col-span-12">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">Recent activity</h3>
              <Button variant="link" className="h-auto p-0 text-primary" onClick={() => navigate({ to: "/runner/activity-history" })}>
                View all
              </Button>
            </div>
            <div className="space-y-3">
              {recentCompleted.length > 0 ? (
                recentCompleted.map((job) => (
                  <ActivityRow
                    key={job.id}
                    icon={<BriefcaseBusiness className="h-5 w-5" />}
                    title={SERVICES[job.serviceType].label}
                    time={`Completed · ${new Date(job.completedAt ?? job.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                    amount={`N$ ${job.estimatedFare.toFixed(2)}`}
                  />
                ))
              ) : (
                <p className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
                  Completed jobs from shared marketplace requests will appear here.
                </p>
              )}
            </div>
          </section>
        </div>
      </main>

      <RunnerBottomNav active="home" />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function InfoTile({
  label,
  value,
  dark,
}: {
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-3 ${dark ? "bg-primary-foreground/10" : "bg-secondary/20"}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${dark ? "opacity-75" : "text-muted-foreground"}`}>{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function OverlayBadge({ title, value }: { title: string; value: string }) {
  return (
    <div className="pointer-events-auto rounded-xl border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function ActivityRow({ icon, title, time, amount }: { icon: ReactNode; title: string; time: string; amount: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-primary">{icon}</div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{time}</p>
        </div>
      </div>
      <p className="font-semibold">{amount}</p>
    </div>
  );
}

function VerificationPendingBanner({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-amber-950">Verification in progress</h2>
      <p className="mt-1 text-sm text-amber-900/80">
        Your profile is under review. You can check your status here anytime. Going online and accepting jobs will unlock
        once you are approved.
      </p>
      <Button
        variant="link"
        className="mt-3 h-auto p-0 text-amber-950"
        onClick={() => navigate({ to: "/runner/onboarding/verification" })}
      >
        View verification details
      </Button>
    </div>
  );
}

function WalletGlyph() {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 10V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4" />
      <path d="M3 10h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8Z" />
      <path d="M16 14h.01" />
    </svg>
  );
}
