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

  const openDisputes = jobs.filter((j) => j.status === "declined").length;

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Finance oversight"
        title="Payments & financial analytics"
        description="Settlement batches and revenue from completed marketplace jobs (15% platform fee on fares)."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PortalStatTile
          icon={TrendingUp}
          label="Revenue (MTD)"
          value={paymentStats.totalRevenue}
          meta="Completed fares this month"
        />
        <PortalStatTile
          icon={CreditCard}
          label="Runner payouts (MTD est.)"
          value={paymentStats.pendingPayouts}
          meta="Net to runners after platform fee"
        />
        <PortalStatTile
          icon={Users}
          label="Runners with activity"
          value={paymentStats.activeRunners}
          meta="Assigned or completed recently"
        />
        <PortalStatTile
          icon={Percent}
          label="Platform fee"
          value={paymentStats.avgCommission}
          meta="Applied on completed fares"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr,0.9fr]">
        <PortalSection title="Monthly revenue trends" description="Completed job GMV · last six months (N$ thousands).">
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

        <PortalSection title="Key signals" description="From live job outcomes.">
          <div className="space-y-4">
            <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/80">
                Completed this month
              </p>
              <p className="mt-2 text-2xl font-black">
                {jobs.filter((j) => j.status === "completed").length}
              </p>
              <p className="mt-1 text-sm text-primary-foreground/80">Jobs in synced marketplace data.</p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/20 p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Declined / cancelled</p>
                <ArrowUpRight className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {openDisputes} jobs declined or cancelled in the dataset.
              </p>
            </div>
          </div>
        </PortalSection>
      </div>

      <PortalSection title="Daily settlement batches" description="Grouped completed fares by day (synthetic batches from job data).">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
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
                    No completed jobs to settle yet.
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
                      <StatusPill tone={batch.status === "Settled" ? "success" : "warning"}>
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
