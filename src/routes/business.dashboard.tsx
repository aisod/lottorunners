import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, TrendingUp, Truck, Users } from "lucide-react";
import { useMemo } from "react";
import { PortalPageIntro, PortalSection, PortalStatTile, StatusPill } from "@/components/portal-primitives";
import { Button } from "@/components/ui/button";
import { businessJobActivityTitle } from "@/lib/business-jobs";
import { useBusinessJobs } from "@/lib/use-business-jobs";
import { jobStatusLabel } from "@/lib/jobs-service";
import { LiveMapClient } from "@/components/live-map-client";
import { getJobActiveDropoff } from "@/lib/job-route-stops";
import { useAssignedRunnerLocation } from "@/lib/use-assigned-runner-location";
import type { MarketplaceJob, MarketplaceJobStatus } from "@/lib/jobs-types";

export const Route = createFileRoute("/business/dashboard")({
  component: BusinessDashboardPage,
});

function BusinessDashboardPage() {
  const jobs = useBusinessJobs();

  const trackingJob = useMemo(() => {
    return jobs.find((j) => {
      const runnerEmail = j.runnerEmail ?? j.runnerId ?? null;
      if (!runnerEmail) return false;
      if (j.status === "pending") return false;
      if (j.status === "cancelled") return false;
      if (j.status === "declined") return false;
      if (j.status === "completed") return false;
      return true;
    });
  }, [jobs]);

  const { runner: assignedRunner, freshnessLabel } = useAssignedRunnerLocation(trackingJob ?? null);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const thisMonth = jobs.filter((j) => j.createdAt >= monthStart);
    const active = jobs.filter(
      (j) => j.status !== "completed" && j.status !== "cancelled" && j.status !== "declined",
    );
    const spend = thisMonth.reduce((sum, j) => sum + j.estimatedFare, 0);
    return {
      monthlySpend: spend,
      activeCount: active.length,
      totalJobs: jobs.length,
    };
  }, [jobs]);

  const recentJobs = jobs.slice(0, 12);

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Corporate operations"
        title="Business dashboard"
        description="Live view of your dispatched marketplace jobs and batches."
        action={
          <Button asChild className="gap-2">
            <Link to="/business/bulk-request">
              <Plus className="h-4 w-4" />
              New dispatch
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <PortalStatTile
          icon={TrendingUp}
          label="Monthly spend (est.)"
          value={`N$ ${stats.monthlySpend.toLocaleString()}`}
          meta={`${jobs.filter((j) => j.createdAt >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()).length} jobs this month`}
        />
        <PortalStatTile
          icon={Truck}
          label="Active jobs"
          value={String(stats.activeCount)}
          meta={stats.activeCount === 0 ? "No open dispatches" : "Awaiting or in progress"}
        />
        <PortalStatTile
          icon={Users}
          label="Total dispatches"
          value={String(stats.totalJobs)}
          meta="All time on this account"
        />
      </div>

      {trackingJob ? (
        <PortalSection
          title="Live runner tracking"
          description="Track your assigned runner location in real time."
        >
          <div className="rounded-2xl border border-border bg-white/80 p-2">
            <div className="h-72 overflow-hidden rounded-xl">
              <LiveMapClient
                userLocation={null}
                runners={assignedRunner ? [assignedRunner] : []}
                pickup={trackingJob.pickup}
                destination={getJobActiveDropoff(trackingJob)}
                activeRunner={assignedRunner}
                followLocation={assignedRunner?.position ?? null}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {freshnessLabel ?? "Waiting for runner GPS…"}
          </p>
        </PortalSection>
      ) : null}

      <PortalSection
        title="Corporate dispatches"
        description="Jobs posted to the shared marketplace — runners see pending requests like customer bookings."
      >
        {recentJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/20 px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No business jobs yet.</p>
            <Button asChild className="mt-4">
              <Link to="/business/bulk-request">Create your first bulk dispatch</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <BusinessDispatchRow key={job.id} job={job} />
            ))}
          </div>
        )}
      </PortalSection>
    </div>
  );
}

function BusinessDispatchRow({ job }: { job: MarketplaceJob }) {
  const meta = buildJobMeta(job);

  return (
    <ActivityRow
      title={businessJobActivityTitle(job)}
      meta={meta}
      tag={jobStatusLabel(job.status)}
      tone={statusTone(job.status)}
      amount={`N$ ${job.estimatedFare.toFixed(2)}`}
    />
  );
}

function buildJobMeta(job: {
  batchName?: string;
  runnerName?: string;
  createdAt: number;
  dropoffAddress: string;
}): string {
  const time = new Date(job.createdAt).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const runner = job.runnerName ? `Runner: ${job.runnerName}` : "Awaiting runner";
  const batch = job.batchName ? `${job.batchName} · ` : "";
  return `${batch}${runner} · ${time}`;
}

function statusTone(status: MarketplaceJobStatus): "neutral" | "primary" | "warning" | "danger" {
  if (status === "pending") return "neutral";
  if (status === "completed") return "primary";
  if (status === "cancelled" || status === "declined") return "danger";
  return "warning";
}

function ActivityRow({
  title,
  meta,
  tag,
  tone,
  amount,
}: {
  title: string;
  meta: string;
  tag: string;
  tone: "neutral" | "primary" | "warning" | "danger";
  amount: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-white/80 px-4 py-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Truck className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{meta}</p>
      </div>
      <div className="text-right">
        <StatusPill tone={tone}>{tag}</StatusPill>
        <p className="mt-2 text-sm font-semibold">{amount}</p>
      </div>
    </div>
  );
}
