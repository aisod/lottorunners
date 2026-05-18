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

export const Route = createFileRoute("/admin/payments")({
  component: AdminPaymentsPage,
});

const BATCHES = [
  {
    id: "PAY-2026-05-08-A",
    gross: "N$ 410,200",
    net: "N$ 382,440",
    runners: 128,
    status: "Processing",
  },
  {
    id: "PAY-2026-05-07-C",
    gross: "N$ 398,900",
    net: "N$ 371,520",
    runners: 119,
    status: "Settled",
  },
  {
    id: "PAY-2026-05-06-B",
    gross: "N$ 401,100",
    net: "N$ 373,020",
    runners: 121,
    status: "Settled",
  },
];

const SERIES = [
  { month: "Jan", value: 620 },
  { month: "Feb", value: 655 },
  { month: "Mar", value: 690 },
  { month: "Apr", value: 742 },
  { month: "May", value: 810 },
  { month: "Jun", value: 842 },
];

const chartConfig = {
  value: { label: "Revenue (N$k)", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Finance oversight"
        title="Payments & financial analytics"
        description="Settlement batches, payout exposure, and revenue mix across the runner network."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PortalStatTile icon={TrendingUp} label="Total revenue" value="N$ 842,500" meta="+12.5% from last month" />
        <PortalStatTile icon={CreditCard} label="Pending payouts" value="N$ 128,400" meta="To be processed by Friday" />
        <PortalStatTile icon={Users} label="Active runners" value="1,248" meta="+42 this week" />
        <PortalStatTile icon={Percent} label="Avg. commission" value="14.2%" meta="Global platform average" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr,0.9fr]">
        <PortalSection title="Monthly revenue trends" description="Last six months · illustrative platform revenue.">
          <ChartContainer config={chartConfig} className="aspect-[16/9] w-full">
            <AreaChart accessibilityLayer data={SERIES} margin={{ left: 8, right: 8 }}>
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

        <PortalSection title="Key signals" description="What finance should watch next.">
          <div className="space-y-4">
            <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/80">Revenue acceleration</p>
              <p className="mt-2 text-2xl font-black">+18%</p>
              <p className="mt-1 text-sm text-primary-foreground/80">Windhoek volume is leading the current uplift.</p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/20 p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Runner payout risk</p>
                <ArrowUpRight className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">2 disputes remain open. No chargeback spike detected.</p>
            </div>
          </div>
        </PortalSection>
      </div>

      <PortalSection title="Settlement batches" description="Recent clearing cycles and payout status.">
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
              {BATCHES.map((batch) => (
                <tr key={batch.id} className="bg-white/85 hover:bg-secondary/25">
                  <td className="px-4 py-3 font-mono font-semibold text-primary">{batch.id}</td>
                  <td className="px-4 py-3">{batch.gross}</td>
                  <td className="px-4 py-3">{batch.net}</td>
                  <td className="px-4 py-3">{batch.runners}</td>
                  <td className="px-4 py-3">
                    <StatusPill tone={batch.status === "Settled" ? "success" : "warning"}>{batch.status}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PortalSection>
    </div>
  );
}
