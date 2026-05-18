import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Activity, ShieldAlert, TrendingUp, Users } from "lucide-react";
import { PortalPageIntro, PortalSection, PortalStatTile } from "@/components/portal-primitives";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalyticsPage,
});

const SERIES = [
  { w: "W1", jobs: 4200, gm: 118 },
  { w: "W2", jobs: 4450, gm: 122 },
  { w: "W3", jobs: 4310, gm: 119 },
  { w: "W4", jobs: 4680, gm: 126 },
  { w: "W5", jobs: 4820, gm: 128 },
];

const chartConfig = {
  jobs: { label: "Completed jobs", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Strategic audit"
        title="Platform analytics"
        description="Long-term platform health, demand, completion quality, and revenue mix."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <PortalStatTile icon={Users} label="MAU" value="48.2k" meta="+3.1% vs prior month" />
        <PortalStatTile icon={Activity} label="Completion rate" value="94.6%" meta="Trailing 28 days" />
        <PortalStatTile icon={TrendingUp} label="GMV (N$ m)" value="6.8" meta="Platform gross, month to date" />
      </div>

      <PortalSection title="Completed jobs trend" description="Weekly buckets · Namibia-wide.">
        <div>
          <ChartContainer config={chartConfig} className="aspect-[21/9] max-h-72 w-full">
            <AreaChart accessibilityLayer data={SERIES} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="w" tickLine={false} axisLine={false} tickMargin={8} />
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
        <PortalSection title="Quality & risk" description="Snapshot metrics and risk watchlist.">
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <p className="font-semibold">CSAT (30d)</p>
              <p className="mt-2 text-3xl font-black text-primary">4.72</p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <p className="font-semibold">Chargeback rate</p>
              <p className="mt-2 text-3xl font-black text-primary">0.09%</p>
            </div>
          </div>
        </PortalSection>

        <PortalSection title="Executive flags" description="Current concerns requiring review.">
          <div className="space-y-3">
            <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/80">Healthy trend</p>
              <p className="mt-2 text-lg font-bold">Demand growth is outpacing incident growth.</p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/20 p-5">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                Trust watch
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Runner verification backlog remains elevated in Windhoek.</p>
            </div>
          </div>
        </PortalSection>
      </div>
    </div>
  );
}
