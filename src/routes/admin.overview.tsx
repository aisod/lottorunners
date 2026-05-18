import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, MapPinned, ShieldAlert, Star, Truck, UserCheck } from "lucide-react";
import { PortalPageIntro, PortalSection, PortalStatTile, StatusPill } from "@/components/portal-primitives";

export const Route = createFileRoute("/admin/overview")({
  component: AdminOverviewPage,
});

const ACTIVITY = [
  { event: "Job completed · LR-9281", actor: "Lukas N. (Runner)", time: "2 mins ago", tone: "success" as const },
  { event: "Payment failed · TX-4402", actor: "Petrus H. (User)", time: "14 mins ago", tone: "danger" as const },
  { event: "New runner registration", actor: "Saara M. (Pending)", time: "32 mins ago", tone: "primary" as const },
  { event: "Support escalation opened", actor: "Walvis Bay control", time: "48 mins ago", tone: "warning" as const },
];

const TOP_RUNNERS = [
  { initials: "JK", name: "Johannes K.", meta: "4.9 · 124 jobs" },
  { initials: "EN", name: "Esther N.", meta: "4.8 · 98 jobs" },
  { initials: "PT", name: "Paulus T.", meta: "4.7 · 203 jobs" },
];

function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Global monitoring"
        title="Operations command center"
        description="Live fleet supervision, recent activity, and trust signals across the Lotto Runners network."
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <PortalSection
            title="Live fleet · Windhoek"
            description="High-priority jobs, runner movement, and demand hotspots in one view."
            action={
              <div className="flex flex-wrap gap-2">
                <StatusPill tone="primary">All runners</StatusPill>
                <StatusPill>Active only</StatusPill>
              </div>
            }
            bodyClassName="space-y-5"
          >
            <div className="relative h-[420px] overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_20%_20%,rgba(0,93,152,0.18),transparent_28%),linear-gradient(135deg,#dfe8ff_0%,#eef3ff_42%,#d6e5fb_100%)]">
              <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(0,93,152,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(0,93,152,0.14)_1px,transparent_1px)] [background-size:54px_54px]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_70%,rgba(186,26,26,0.12),transparent_18%)]" />
              <div className="absolute left-[16%] top-[18%] rounded-full border-4 border-white bg-primary p-2 text-white shadow-lg">
                <Truck className="h-4 w-4" />
              </div>
              <div className="absolute left-[56%] top-[24%] rounded-full border-4 border-white bg-primary p-2 text-white shadow-lg">
                <MapPinned className="h-4 w-4" />
              </div>
              <div className="absolute right-[18%] top-[38%] rounded-full border-4 border-white bg-destructive p-2 text-white shadow-lg">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div className="absolute bottom-5 left-5 max-w-xs rounded-2xl border border-white/60 bg-white/90 p-4 shadow-lg backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Demand signal</p>
                <p className="mt-1 text-lg font-bold text-primary">Windhoek CBD spike</p>
                <p className="mt-1 text-sm text-muted-foreground">Taxi demand is up 18% versus the previous hour.</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-secondary/50 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Runner / User</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ACTIVITY.map((row) => (
                    <tr key={`${row.event}-${row.time}`} className="bg-white/80 hover:bg-secondary/30">
                      <td className="px-4 py-3 font-semibold">{row.event}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.actor}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.time}</td>
                      <td className="px-4 py-3">
                        <StatusPill tone={row.tone}>
                          {row.tone === "danger"
                            ? "Retry required"
                            : row.tone === "warning"
                              ? "Escalated"
                              : row.tone === "success"
                                ? "Finalized"
                                : "Verification"}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PortalSection>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <PortalStatTile icon={Truck} label="Total active jobs" value="1,248" meta="+12% vs yesterday" tone="primary" />
          <PortalStatTile icon={CreditCard} label="Revenue today" value="N$ 14,820" meta="Wallet settlements are healthy" />
          <PortalStatTile icon={UserCheck} label="Pending verifications" value="28" meta="Runner and business approvals" tone="danger" />

          <PortalSection title="Top performing runners" description="Fastest, highest rated runners today.">
            <div className="space-y-3">
              {TOP_RUNNERS.map((runner) => (
                <div
                  key={runner.initials}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-white/80 px-4 py-3"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary">
                    {runner.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{runner.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3.5 w-3.5 fill-current text-primary" />
                      {runner.meta}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </PortalSection>
        </div>
      </div>
    </div>
  );
}
