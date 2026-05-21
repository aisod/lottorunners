import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, Clock3, MapPin, Wallet } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { acceptJob, declineJob, getCurrentRunnerId, listAvailableJobsForRunner } from "@/lib/jobs-service";
import { canRunnerAcceptJobs } from "@/lib/runner-account";
import { getUserDisplayName } from "@/lib/auth-users";
import { SERVICES } from "@/lib/services";
import { useMarketplaceJob } from "@/lib/use-marketplace-job";

export const Route = createFileRoute("/runner/incoming-job-alert")({
  validateSearch: (search: Record<string, unknown>) => ({
    jobId: typeof search.jobId === "string" ? search.jobId : "",
  }),
  component: RunnerIncomingJobAlertPage,
});

const ACCEPT_WINDOW_SECONDS = 60;

function RunnerIncomingJobAlertPage() {
  const navigate = useNavigate();
  const { jobId: searchJobId } = Route.useSearch();
  const runnerId = getCurrentRunnerId();
  const pending = listAvailableJobsForRunner(runnerId);
  const resolvedJobId = searchJobId || pending[0]?.id || "";
  const job = useMarketplaceJob(resolvedJobId);
  const [secondsLeft, setSecondsLeft] = useState(ACCEPT_WINDOW_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!canRunnerAcceptJobs()) {
      navigate({ to: "/runner/onboarding/verification", replace: true });
      return;
    }
    if (!resolvedJobId || (job && job.status !== "pending")) {
      navigate({ to: "/runner/dashboard", replace: true });
    }
  }, [resolvedJobId, job, navigate]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      navigate({ to: "/runner/dashboard", replace: true });
      return;
    }
    const timer = window.setTimeout(() => setSecondsLeft((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [navigate, secondsLeft]);

  if (!job) {
    return <div className="flex min-h-dvh items-center justify-center p-6 text-muted-foreground">Loading job…</div>;
  }

  const serviceLabel = SERVICES[job.serviceType].label;

  const handleAccept = () => {
    if (!canRunnerAcceptJobs()) {
      setError("Your runner profile must be approved before you can accept jobs.");
      return;
    }
    const currentRunnerId = getCurrentRunnerId();
    if (!currentRunnerId) {
      navigate({ to: "/customer/signin" });
      return;
    }
    const runnerName = getUserDisplayName(currentRunnerId) ?? "Runner";
    setAccepting(true);
    setError(null);
    void acceptJob(job.id, currentRunnerId, runnerName).then((result) => {
      setAccepting(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      navigate({ to: "/runner/active-job", search: { jobId: job.id } });
    });
  };

  const handleDecline = () => {
    if (runnerId) declineJob(job.id, runnerId);
    navigate({ to: "/runner/dashboard" });
  };

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(0,93,152,0.18),transparent_38%),linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] px-5 py-8">
      <div className="mx-auto max-w-lg">
        <div className="rounded-[2rem] border bg-card p-6 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Incoming job alert</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">{serviceLabel}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Review the request and accept or decline before the timer ends.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label="Notifications"
              disabled
              title="Notifications are not available yet"
            >
              <Bell className="h-5 w-5 text-primary opacity-50" />
            </Button>
          </div>

          <div className="mt-6 rounded-3xl bg-primary p-5 text-primary-foreground">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">Customer</p>
                <p className="mt-1 text-2xl font-bold">{job.customerName}</p>
              </div>
              <div className="rounded-2xl bg-primary-foreground/10 px-4 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-75">Expires in</p>
                <p className="mt-1 text-2xl font-black">{secondsLeft}s</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <MetricTile icon={<Wallet className="h-4 w-4" />} label="Estimated pay" value={`N$ ${job.estimatedFare}`} />
              <MetricTile icon={<Clock3 className="h-4 w-4" />} label="Pickup ETA" value={`${job.etaMin} min`} />
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <DetailRow label="Pickup" value={job.pickupAddress} />
            <DetailRow label="Drop-off" value={job.dropoffAddress} />
            <DetailRow label="Task summary" value={job.description ?? serviceLabel} />
          </div>
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12 text-base" onClick={handleDecline} disabled={accepting}>
              Pass
            </Button>
            <Button className="h-12 text-base" onClick={handleAccept} disabled={accepting}>
              {accepting ? "Accepting…" : "Accept job"}
            </Button>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            {job.distanceKm.toFixed(1)} km total route from pickup to drop-off.
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-primary-foreground/10 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-secondary/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}