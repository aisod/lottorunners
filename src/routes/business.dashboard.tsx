import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, Truck, Users } from "lucide-react";
import { PortalPageIntro, PortalSection, PortalStatTile, StatusPill } from "@/components/portal-primitives";

export const Route = createFileRoute("/business/dashboard")({
  component: BusinessDashboardPage,
});

function BusinessDashboardPage() {
  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Corporate operations"
        title="Business dashboard"
        description="Welcome back. Here is your corporate activity overview for October."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <PortalStatTile icon={TrendingUp} label="Monthly spend" value="N$ 124,500" meta="12% vs last month" />
        <PortalStatTile icon={Truck} label="Active errands" value="42" meta="8 arriving today" />
        <PortalStatTile icon={Users} label="Authorized employees" value="158" meta="Active on portal" />
      </div>

      <PortalSection title="Active corporate errands" description="Current batches and scheduled business requests.">
        <div className="space-y-3">
          <ActivityRow title="Documents delivery · HQ to Branch A" meta="Requested by John Doe · 14:30 today" tag="In transit" amount="N$ 120" />
          <ActivityRow title="Bulk stationery pickup" meta="Requested by Sarah Smith · 12:15 today" tag="Assigned" amount="N$ 350" />
          <ActivityRow title="Client airport transfer" meta="Requested by Admin · 16:00 scheduled" tag="Scheduled" amount="N$ 450" />
        </div>
      </PortalSection>
    </div>
  );
}

function ActivityRow({
  title,
  meta,
  tag,
  amount,
}: {
  title: string;
  meta: string;
  tag: string;
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
        <StatusPill tone={tag === "In transit" ? "warning" : tag === "Assigned" ? "primary" : "neutral"}>{tag}</StatusPill>
        <p className="mt-2 text-sm font-semibold">{amount}</p>
      </div>
    </div>
  );
}
