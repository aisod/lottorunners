import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Activity, ShieldAlert, TrendingUp, Users } from "lucide-react";
import { useMemo } from "react";
import { PortalPageIntro, PortalSection, PortalStatTile } from "@/components/portal-primitives";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  buildWeeklyCompletedBuckets,
  computeAdminPlatformStats,
  formatNad,
} from "@/lib/portal-analytics";
import { useAdminProfiles } from "@/lib/use-admin-profiles";
import { useAllMarketplaceJobs } from "@/lib/use-all-marketplace-jobs";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalyticsPage,
});

const chartConfig = {
  jobs: { label: "Completed jobs", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

function AdminAnalyticsPage() {
  const jobs = useAllMarketplaceJobs();
  const { profiles } = useAdminProfiles();

  const pendingVerifications = useMemo(
    () =>
      profiles.filter(
        (p) =>
          (p.roles ?? []).includes("runner") &&
          p.runner_status !== "approved" &&
          p.runner_status !== "rejected",
      ).length,
    [profiles],
  );

  const stats = useMemo(
    () => computeAdminPlatformStats(jobs, pendingVerifications),
    [jobs, pendingVerifications],
  );

  const series = useMemo(() => buildWeeklyCompletedBuckets(jobs), [jobs]);

  const declined = jobs.filter((j) => j.status === "declined" || j.status === "cancelled").length;
  const chargebackPct =
    jobs.length > 0 ? Math.round((declined / jobs.length) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Strategic audit"
        title="Platform analytics"
        description="Derived from live marketplace_jobs sync — updates as jobs complete or change status."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <PortalStatTile
          icon={Users}
          label="Active accounts (profiles)"
          value={String(profiles.length)}
          meta={`${stats.uniqueCustomersMonth} customers with jobs this month`}
        />
        <PortalStatTile
          icon={Activity}
          label="Completion rate"
          value={`${stats.completionRatePct}%`}
          meta="Completed vs terminal outcomes"
        />
        <PortalStatTile
          icon={TrendingUp}
          label="GMV (month)"
          value={formatNad(stats.gmvMonth, true)}
          meta="Sum of completed fares"
        />
      </div>

      <PortalSection title="Completed jobs trend" description="Weekly completed jobs · last 5 weeks.">
        <div>
          <ChartContainer config={chartConfig} className="aspect-[21/9] max-h-72 w-full">
            <AreaChart accessibilityLayer data={series} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                dataKey="jobs"
                type="monotone"
                fill="var(--color-jobs)"
                fillOpacity={0.3}
                stroke="var(--color-jobs)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </PortalSection>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <PortalSection title="Quality & risk" description="From completed job ratings and cancellations.">
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <p className="font-semibold">Avg job rating</p>
              <p className="mt-2 text-3xl font-black text-primary">
                {stats.avgRating != null ? stats.avgRating.toFixed(2) : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <p className="font-semibold">Cancel / decline rate</p>
              <p className="mt-2 text-3xl font-black text-primary">{chargebackPct}%</p>
            </div>
          </div>
        </PortalSection>

        <PortalSection title="Executive flags" description="Auto-generated from current job board.">
          <div className="space-y-3">
            <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/80">
                {stats.pendingJobs > 0 ? "Attention" : "Healthy"}
              </p>
              <p className="mt-2 text-sm text-primary-foreground/90">
                {stats.pendingJobs > 0
                  ? `${stats.pendingJobs} jobs are waiting for runner assignment.`
                  : "No pending jobs in the marketplace."}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/20 p-5">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Runner pipeline
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {pendingVerifications > 0
                  ? `${pendingVerifications} runner profiles need verification review.`
                  : "No runners pending verification."}
              </p>
            </div>
          </div>
        </PortalSection>
      </div>
    </div>
  );
}
