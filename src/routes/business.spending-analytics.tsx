import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { AlertTriangle, Download, TrendingUp, Wallet } from "lucide-react";
import { useMemo } from "react";
import { PortalPageIntro, PortalSection, PortalStatTile, StatusPill } from "@/components/portal-primitives";
import { businessJobActivityTitle } from "@/lib/business-jobs";
import {
  buildBusinessMonthlySpend,
  computeBusinessSpendStats,
  formatNad,
} from "@/lib/portal-analytics";
import { useBusinessJobs } from "@/lib/use-business-jobs";
import { SERVICES } from "@/lib/services";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const Route = createFileRoute("/business/spending-analytics")({
  component: BusinessSpendingAnalyticsPage,
});

const chartConfig = {
  spend: { label: "Spend (N$)", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

function BusinessSpendingAnalyticsPage() {
  const jobs = useBusinessJobs();
  const stats = useMemo(() => computeBusinessSpendStats(jobs), [jobs]);
  const chartData = useMemo(() => buildBusinessMonthlySpend(jobs), [jobs]);

  const recent = useMemo(
    () =>
      [...jobs]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 8)
        .map((job) => ({
          id: job.id,
          label: businessJobActivityTitle(job),
          amount: formatNad(job.estimatedFare),
          tag: SERVICES[job.serviceType]?.label ?? job.serviceType,
        })),
    [jobs],
  );

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Financials"
        title="Spending analytics"
        description="Live totals from your dispatched marketplace jobs — updates in real time."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <PortalStatTile
          icon={Wallet}
          label="MTD spend (est.)"
          value={formatNad(stats.monthlySpend, true)}
          meta={`${stats.mtdJobCount} dispatches this month`}
        />
        <PortalStatTile
          icon={AlertTriangle}
          label="High-value flags"
          value={String(stats.policyFlags)}
          meta="Jobs ≥ N$ 2,500 estimated fare"
        />
        <PortalStatTile
          icon={TrendingUp}
          label="Top service (MTD)"
          value={stats.topServiceLabel}
          meta={
            stats.topServicePct > 0 ? `${stats.topServicePct}% of monthly spend` : "No spend yet"
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr,0.9fr]">
        <PortalSection title="Spend trend" description="Your business dispatches · last five months.">
          <div>
            <ChartContainer config={chartConfig} className="aspect-[21/9] max-h-72 w-full">
              <BarChart accessibilityLayer data={chartData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="spend" fill="var(--color-spend)" radius={4} />
              </BarChart>
            </ChartContainer>
          </div>
        </PortalSection>

        <PortalSection title="Recent dispatches" description="Latest jobs on your account.">
          <div className="space-y-3">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No business jobs yet.</p>
            ) : (
              recent.map((row) => (
                <Row key={row.id} label={row.label} amount={row.amount} tag={row.tag} />
              ))
            )}
          </div>
        </PortalSection>
      </div>
    </div>
  );
}

function Row({ label, amount, tag }: { label: string; amount: string; tag: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-white/85 px-4 py-3">
      <div>
        <p className="font-medium">{label}</p>
        <div className="mt-2">
          <StatusPill tone="primary">{tag}</StatusPill>
        </div>
      </div>
      <p className="font-semibold tabular-nums text-primary">{amount}</p>
    </div>
  );
}
