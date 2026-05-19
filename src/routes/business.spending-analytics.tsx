import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { AlertTriangle, Download, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifyUnavailable, UNAVAILABLE } from "@/lib/user-feedback";
import { PortalPageIntro, PortalSection, PortalStatTile, StatusPill } from "@/components/portal-primitives";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const Route = createFileRoute("/business/spending-analytics")({
  component: BusinessSpendingAnalyticsPage,
});

const CHART_DATA = [
  { month: "Jan", spend: 142000 },
  { month: "Feb", spend: 155000 },
  { month: "Mar", spend: 148000 },
  { month: "Apr", spend: 168000 },
  { month: "May", spend: 182000 },
];

const chartConfig = {
  spend: { label: "Spend (N$)", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

function BusinessSpendingAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Financials"
        title="Spending analytics"
        description="Detailed breakdown of corporate logistics expenditure and policy exceptions."
        action={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled
              title={UNAVAILABLE.analyticsDateRange}
              onClick={() => notifyUnavailable(UNAVAILABLE.analyticsDateRange)}
            >
              Last 30 days
            </Button>
            <Button
              type="button"
              className="gap-2"
              disabled
              title={UNAVAILABLE.analyticsExport}
              onClick={() => notifyUnavailable(UNAVAILABLE.analyticsExport)}
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <PortalStatTile icon={Wallet} label="MTD spend" value="N$ 182k" meta="+8% vs prior month" />
        <PortalStatTile icon={AlertTriangle} label="Policy flags" value="3" meta="Awaiting manager review" />
        <PortalStatTile icon={TrendingUp} label="Top cost center" value="Logistics" meta="44% of categorized spend" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr,0.9fr]">
        <PortalSection title="Spend trend" description="Company-wide · last five months.">
          <div>
          <ChartContainer config={chartConfig} className="aspect-[21/9] max-h-72 w-full">
            <BarChart accessibilityLayer data={CHART_DATA} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="spend" fill="var(--color-spend)" radius={4} />
            </BarChart>
          </ChartContainer>
          </div>
        </PortalSection>

        <PortalSection title="Recent transactions" description="Sample data only — connect to live invoicing in a future release.">
          <div className="space-y-3">
            <Row label="Bulk batch LR-B-104" amount="N$ 28,400" tag="Logistics" />
            <Row label="Employee ride · J. Shilongo" amount="N$ 85" tag="Travel" />
            <Row label="Errand · office supplies" amount="N$ 1,240" tag="Ops" />
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
