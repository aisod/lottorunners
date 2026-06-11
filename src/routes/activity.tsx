import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { CustomerPageShell } from "@/components/customer-page-shell";
import { Button } from "@/components/ui/button";
import { useCustomerApp } from "@/lib/customer-store";
import {
  cancelJob,
  canCustomerCancelJob,
  CUSTOMER_ACTIVE_STATUSES,
  getCurrentCustomerId,
  getCustomerActiveTripActionLabel,
  getCustomerActiveTripPath,
  hydrateJobsFromRemote,
  listJobsForCustomer,
  subscribeToJobs,
} from "@/lib/jobs-service";
import type { MarketplaceJob, MarketplaceJobStatus } from "@/lib/jobs-types";
import { isSupabaseAuthRateLimited } from "@/lib/auth/ensure-session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SERVICES } from "@/lib/services";

export const Route = createFileRoute("/activity")({
  beforeLoad: () => {
    throw redirect({ to: "/customer/activity" });
  },
});

function statusLabel(status: MarketplaceJobStatus): string {
  switch (status) {
    case "pending":
      return "Waiting for runner";
    case "accepted":
      return "Runner accepted";
    case "en_route":
      return "Runner on the way";
    case "arrived":
      return "Runner arrived";
    case "in_progress":
      return "Trip in progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "declined":
      return "Declined";
    default:
      return status;
  }
}

function ActiveTripCard({
  job,
  onResume,
  onCancelled,
}: {
  job: MarketplaceJob;
  onResume: (job: MarketplaceJob) => void;
  onCancelled: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const svc = SERVICES[job.serviceType];
  const canCancel = canCustomerCancelJob(job.status);

  const handleCancel = () => {
    if (cancelling) return;
    const customerId = getCurrentCustomerId();
    if (!customerId) return;

    setCancelling(true);
    setCancelError(null);
    void cancelJob(job.id, customerId).then((result) => {
      setCancelling(false);
      if (!result.ok) {
        setCancelError(result.error);
        return;
      }
      onCancelled();
    });
  };

  return (
    <li className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
          {svc?.icon ?? "🚗"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">{svc?.label ?? job.serviceType}</span>
            <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {statusLabel(job.status)}
            </span>
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {job.pickupAddress} → {job.dropoffAddress}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Request #{job.id.slice(-8)} · N$ {job.estimatedFare.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="h-10 flex-1" onClick={() => onResume(job)}>
          {getCustomerActiveTripActionLabel(job.status)}
        </Button>
        {canCancel ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? "Cancelling…" : "Cancel trip"}
          </Button>
        ) : null}
      </div>

      {cancelError ? (
        <p className="mt-2 text-sm text-destructive">{cancelError}</p>
      ) : null}
    </li>
  );
}

export function CustomerActivityPage() {
  const navigate = useNavigate();
  const history = useCustomerApp((s) => s.history);
  const setActiveJobId = useCustomerApp((s) => s.setActiveJobId);
  const setStatus = useCustomerApp((s) => s.setStatus);
  const [activeJobs, setActiveJobs] = useState<MarketplaceJob[]>([]);

  useEffect(() => {
    const customerId = getCurrentCustomerId();
    if (!customerId) return;

    const refresh = () => {
      const all = listJobsForCustomer(customerId);
      setActiveJobs(all.filter((j) => CUSTOMER_ACTIVE_STATUSES.has(j.status)));
    };

    refresh();

    if (isSupabaseConfigured()) {
      const pull = async () => {
        if (!isSupabaseAuthRateLimited()) {
          await hydrateJobsFromRemote();
        }
        refresh();
      };
      void pull();
      const interval = window.setInterval(() => void pull(), 15_000);
      const unsub = subscribeToJobs(refresh);
      return () => {
        window.clearInterval(interval);
        unsub();
      };
    }

    return subscribeToJobs(refresh);
  }, []);

  const resumeTrip = (job: MarketplaceJob) => {
    setActiveJobId(job.id);
    setStatus(job.status === "pending" ? "searching" : "matched");
    navigate({ to: getCustomerActiveTripPath(job.status) });
  };

  const handleCancelled = () => {
    setActiveJobId(null);
    const customerId = getCurrentCustomerId();
    if (customerId) {
      const all = listJobsForCustomer(customerId);
      setActiveJobs(all.filter((j) => CUSTOMER_ACTIVE_STATUSES.has(j.status)));
    }
  };

  const hasAny = activeJobs.length > 0 || history.length > 0;

  return (
    <CustomerPageShell width="md" variant="plain" tabBar>
      <header className="sticky top-0 z-10 -mx-4 flex items-center gap-2 border-b border-border bg-card px-4 py-3 sm:-mx-6 sm:px-6">
        <Link
          to="/customer/home"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-secondary"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="flex-1 text-center font-display text-lg font-bold text-primary">Activity</h1>
        <div className="h-9 w-9" />
      </header>

      <div className="p-4">
        {!hasAny ? (
          <div className="mt-20 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-3xl">
              🗺️
            </div>
            <h2 className="font-semibold">No trips yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your completed errands and rides will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeJobs.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Active trip</h2>
                <ul className="space-y-2">
                  {activeJobs.map((job) => (
                    <ActiveTripCard
                      key={job.id}
                      job={job}
                      onResume={resumeTrip}
                      onCancelled={handleCancelled}
                    />
                  ))}
                </ul>
              </section>
            )}

            {history.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Past trips
                </h2>
                <ul className="space-y-2">
                  {history.map((t) => {
                    const svc = SERVICES[t.service];
                    return (
                      <li key={t.id} className="rounded-2xl border border-border bg-card p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-xl">
                            {svc.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{svc.label}</span>
                              <span className="font-bold text-primary">N$ {t.fare}</span>
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {t.pickupLabel} → {t.destinationLabel}
                            </div>
                            {t.scheduledAt ? (
                              <p className="mt-1 text-[11px] font-medium text-primary">
                                Scheduled: {new Date(t.scheduledAt).toLocaleString()}
                              </p>
                            ) : null}
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              {new Date(t.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>

      <BottomTabBar />
    </CustomerPageShell>
  );
}
