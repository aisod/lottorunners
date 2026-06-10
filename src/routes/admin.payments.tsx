import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { PortalPageIntro, PortalSection, PortalStatTile, StatusPill } from "@/components/portal-primitives";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ArrowUpRight, CreditCard, Percent, TrendingUp, Users } from "lucide-react";
import { useMemo } from "react";
import {
  buildMonthlyRevenueBuckets,
  buildSettlementBatches,
  computeAdminPaymentsStats,
} from "@/lib/portal-analytics";
import { getPlatformFeePercent } from "@/lib/platform-pricing";
import { useAllMarketplaceJobs } from "@/lib/use-all-marketplace-jobs";

export const Route = createFileRoute("/admin/payments")({
  component: AdminPaymentsPage,
});

const chartConfig = {
  value: { label: "Revenue (N$k)", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

function AdminPaymentsPage() {
  const jobs = useAllMarketplaceJobs();
  const paymentStats = useMemo(() => computeAdminPaymentsStats(jobs), [jobs]);
  const series = useMemo(() => buildMonthlyRevenueBuckets(jobs), [jobs]);
  const batches = useMemo(() => buildSettlementBatches(jobs), [jobs]);

  const cancelledOrDeclined = jobs.filter(
    (j) => j.status === "declined" || j.status === "cancelled",
  ).length;

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Finance oversight"
        title="Payments & financial analytics"
        description={`Revenue summaries from completed jobs (platform fee: ${getPlatformFeePercent()}%).`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PortalStatTile
          icon={TrendingUp}
          label="Revenue (MTD)"
          value={paymentStats.totalRevenue}
          meta="Completed fares this month"
        />
        <PortalStatTile
          icon={CreditCard}
          label="Runner share (MTD)"
          value={paymentStats.pendingPayouts}
          meta="Net to runners after platform fee"
        />
        <PortalStatTile
          icon={Users}
          label="Runners with activity"
          value={paymentStats.activeRunners}
          meta="Runners on active or completed jobs"
        />
        <PortalStatTile
          icon={Percent}
          label="Platform fee"
          value={paymentStats.avgCommission}
          meta="Applied on completed fares"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr,0.9fr]">
        <PortalSection title="Monthly revenue trends" description="Completed job revenue · last 6 months (N$ thousands).">
          <ChartContainer config={chartConfig} className="aspect-[16/9] w-full">
            <AreaChart accessibilityLayer data={series} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                dataKey="value"
                type="monotone"
                fill="var(--color-value)"
                fillOpacity={0.24}
                stroke="var(--color-value)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </PortalSection>

        <PortalSection title="Key signals" description="From completed and cancelled jobs.">
          <div className="space-y-4">
            <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/80">
                Completed this month
              </p>
              <p className="mt-2 text-2xl font-black">
                {jobs.filter((j) => j.status === "completed").length}
              </p>
              <p className="mt-1 text-sm text-primary-foreground/80">Completed jobs this month.</p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/20 p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Cancelled or declined</p>
                <ArrowUpRight className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {cancelledOrDeclined} jobs cancelled or declined.
              </p>
            </div>
          </div>
        </PortalSection>
      </div>

      <PortalSection
        title="Daily revenue summary"
        description="Completed fares grouped by day. For reporting only — not actual bank settlements."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm lg:min-w-0">
            <thead className="bg-secondary/50 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3">Net to runners</th>
                <th className="px-4 py-3">Runners</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No completed jobs yet.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="bg-white/85 hover:bg-secondary/25">
                    <td className="px-4 py-3 font-mono font-semibold text-primary">{batch.id}</td>
                    <td className="px-4 py-3">{batch.gross}</td>
                    <td className="px-4 py-3">{batch.net}</td>
                    <td className="px-4 py-3">{batch.runners}</td>
                    <td className="px-4 py-3">
                      <StatusPill tone={batch.status === "Complete" ? "success" : "warning"}>
                        {batch.status}
                      </StatusPill>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PortalSection>
    </div>
  );
}
