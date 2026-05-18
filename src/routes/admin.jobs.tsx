import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, MapPin, MessageSquareText, Route as RouteIcon, ShieldCheck, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PortalPageIntro, PortalSection, PortalStatTile, StatusPill } from "@/components/portal-primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/jobs")({
  component: AdminJobsPage,
});

const JOBS = [
  {
    id: "LR-99281",
    type: "Truck",
    title: "Building materials delivery",
    customer: "Okahandja Industrial Site",
    runner: "Petrus Nangolo",
    zone: "Klein Windhoek",
    status: "Delayed",
    eta: "+14 mins",
    note: "Heavy traffic and partial road closure.",
  },
  {
    id: "LR-99279",
    type: "Taxi",
    title: "Airport transfer",
    customer: "M. Shilongo",
    runner: "Martha S.",
    zone: "Katatura",
    status: "In transit",
    eta: "4 mins",
    note: "Passenger picked up and heading to CBD.",
  },
  {
    id: "LR-99276",
    type: "Delivery",
    title: "Medication delivery",
    customer: "Namibian Corp",
    runner: "Sarah L.",
    zone: "CBD",
    status: "Arriving soon",
    eta: "2 mins",
    note: "Near destination and delivery confirmed.",
  },
  {
    id: "LR-99270",
    type: "Errand",
    title: "Grocery shopping",
    customer: "Batch B-104",
    runner: "Johannes K.",
    zone: "Khomas",
    status: "In store",
    eta: "22 mins",
    note: "Runner is picking items inside the store.",
  },
 ] as const;

const FEED = [
  { who: "System", time: "12:40 PM", text: "Runner accepted job and started pickup.", tone: "neutral" },
  { who: "Petrus N.", time: "12:55 PM", text: "Loading 20 bags of cement now. ETA is moving out by 3 hours.", tone: "primary" },
  { who: "Alert", time: "01:15 PM", text: "GPS shows 0km/h for 10 minutes. Delay detected.", tone: "danger" },
  { who: "Petrus N.", time: "01:18 PM", text: "Heavy traffic near the highway bridge. Not moving.", tone: "primary" },
] as const;

function AdminJobsPage() {
  const [selectedJobId, setSelectedJobId] = useState<string>(JOBS[0]?.id ?? "");
  const selectedJob = useMemo(
    () => JOBS.find((job) => job.id === selectedJobId) ?? JOBS[0],
    [selectedJobId],
  );

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Global monitoring"
        title="Active jobs command center"
        description="Live operational oversight across Windhoek, Walvis Bay, and Swakopmund."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PortalStatTile icon={Truck} label="Total active" value="142" meta="Across all services" />
        <PortalStatTile icon={AlertTriangle} label="Critical alerts" value="08" meta="Delayed or at-risk jobs" tone="danger" />
        <PortalStatTile icon={RouteIcon} label="Route efficiency" value="62%" meta="Reroutes suggested in CBD" />
        <PortalStatTile icon={ShieldCheck} label="Secured payments" value="N$ 2,450" meta="In escrow for selected job" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,2fr]">
        <PortalSection
          title="Ongoing services"
          description={`${JOBS.length} jobs · sorted by urgency`}
          action={
            <div className="flex gap-2">
              <StatusPill>Filter</StatusPill>
              <StatusPill>Sort</StatusPill>
            </div>
          }
          bodyClassName="p-0"
        >
          <div className="divide-y divide-border">
            {JOBS.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => setSelectedJobId(job.id)}
                className={cn(
                  "flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-secondary/20",
                  selectedJob.id === job.id && "bg-secondary/30",
                )}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{job.title}</p>
                    <StatusPill tone={job.status === "Delayed" ? "danger" : job.status === "Arriving soon" ? "success" : "primary"}>
                      {job.status}
                    </StatusPill>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Runner: {job.runner} · {job.eta}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.zone}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </PortalSection>

        <div className="space-y-6">
          <PortalSection
            title={`${selectedJob.title} · ${selectedJob.id}`}
            description={`${selectedJob.type} service · Runner ${selectedJob.runner}`}
            action={
              <div className="flex flex-wrap gap-2">
                <Button size="sm">Support intervention</Button>
                <Button size="sm" variant="outline">
                  Reassign runner
                </Button>
              </div>
            }
            bodyClassName="space-y-5"
          >
            <div className="grid gap-5 xl:grid-cols-[1.5fr,0.9fr]">
              <div className="relative h-[360px] overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#d9e6ff_0%,#eef4ff_52%,#dde8fb_100%)]">
                <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(0,93,152,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(0,93,152,0.14)_1px,transparent_1px)] [background-size:48px_48px]" />
                <div className="absolute left-[54%] top-[48%] rounded-full border-4 border-white bg-destructive p-3 text-white shadow-lg">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="absolute bottom-4 left-4 max-w-xs rounded-2xl border border-white/70 bg-white/90 p-4 shadow-lg backdrop-blur">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Route efficiency</span>
                    <span className="font-bold text-destructive">62%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-secondary">
                    <div className="h-full w-[62%] rounded-full bg-destructive" />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{selectedJob.note}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/20">
                <div className="border-b border-border px-4 py-3 text-sm font-semibold">Live activity log</div>
                <div className="space-y-4 px-4 py-4">
                  {FEED.map((entry) => (
                    <div key={`${entry.who}-${entry.time}`} className="space-y-1">
                      <p className={cn("text-[11px] font-bold uppercase tracking-[0.16em]", entry.tone === "danger" ? "text-destructive" : entry.tone === "primary" ? "text-primary" : "text-muted-foreground")}>
                        {entry.who} · {entry.time}
                      </p>
                      <div
                        className={cn(
                          "rounded-2xl px-3 py-2 text-sm",
                          entry.tone === "danger" && "border border-destructive/20 bg-destructive/10",
                          entry.tone === "primary" && "bg-primary/10 text-primary",
                          entry.tone === "neutral" && "bg-background",
                        )}
                      >
                        {entry.text}
                      </div>
                    </div>
                  ))}
                  <div className="rounded-2xl border border-border bg-background px-3 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Message runner..."
                        className="h-9 flex-1 bg-transparent text-sm outline-none"
                      />
                      <MessageSquareText className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-secondary/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Destination</p>
                <p className="mt-2 font-semibold">{selectedJob.customer}</p>
                <p className="text-sm text-muted-foreground">{selectedJob.zone}</p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Payment status</p>
                <p className="mt-2 font-semibold text-primary">N$ 2,450.00</p>
                <p className="text-sm text-muted-foreground">Secured in escrow</p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Service type</p>
                <p className="mt-2 font-semibold">{selectedJob.type}</p>
                <p className="text-sm text-muted-foreground">{selectedJob.status}</p>
              </div>
            </div>
          </PortalSection>
        </div>
      </div>
    </div>
  );
}
