import { createFileRoute } from "@tanstack/react-router";
import { Activity, AlertTriangle, Clock, ListChecks, MapPin, MessageSquareText, Route as RouteIcon, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PortalPageIntro, PortalSection, PortalStatTile, StatusPill } from "@/components/portal-primitives";
import { jobStatusLabel, listActiveJobs, subscribeToJobs } from "@/lib/jobs-service";
import { SERVICES } from "@/lib/services";
import type { MarketplaceJob } from "@/lib/jobs-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/jobs")({
  component: AdminJobsPage,
});

function statusTone(status: MarketplaceJob["status"]): "neutral" | "primary" | "danger" {
  if (status === "cancelled" || status === "declined") return "danger";
  if (status === "pending") return "neutral";
  return "primary";
}

function AdminJobsPage() {
  const [jobs, setJobs] = useState<MarketplaceJob[]>([]);

  useEffect(() => {
    setJobs(listActiveJobs());
    return subscribeToJobs(() => setJobs(listActiveJobs()));
  }, []);

  const [selectedJobId, setSelectedJobId] = useState("");
  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? null,
    [jobs, selectedJobId],
  );

  useEffect(() => {
    if (jobs.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId]);

  const pendingCount = jobs.filter((j) => j.status === "pending").length;
  const inProgressCount = jobs.filter((j) =>
    ["accepted", "en_route", "arrived", "in_progress"].includes(j.status),
  ).length;

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Global monitoring"
        title="Active jobs command center"
        description="Live marketplace jobs from customer requests and runner assignments."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <PortalStatTile label="Active jobs" value={String(jobs.length)} />
        <PortalStatTile label="Pending" value={String(pendingCount)} />
        <PortalStatTile label="In progress" value={String(inProgressCount)} />
        <PortalStatTile label="Delayed" value="0" hint="Set when SLA rules are added" />
      </div>

      {jobs.length === 0 ? (
        <PortalSection title="No active jobs">
          <p className="text-sm text-muted-foreground">
            When customers create requests, they will appear here in real time.
          </p>
        </PortalSection>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <PortalSection title="Live job board">
            <div className="space-y-3">
              {jobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setSelectedJobId(job.id)}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition",
                    selectedJob?.id === job.id ? "border-primary bg-secondary/30" : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {SERVICES[job.serviceType].label} · #{job.id.slice(-8)}
                      </p>
                      <h3 className="mt-1 font-semibold">{job.description ?? SERVICES[job.serviceType].label}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {job.customerName}
                        {job.runnerName ? ` → ${job.runnerName}` : " · awaiting runner"}
                      </p>
                    </div>
                    <StatusPill label={jobStatusLabel(job.status)} tone={statusTone(job.status)} />
                  </div>
                </button>
              ))}
            </div>
          </PortalSection>

          {selectedJob ? (
            <PortalSection title="Job detail">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Detail icon={<Truck className="h-4 w-4" />} label="Service" value={SERVICES[selectedJob.serviceType].label} />
                  <Detail icon={<ShieldCheck className="h-4 w-4" />} label="Status" value={jobStatusLabel(selectedJob.status)} />
                  <Detail icon={<MapPin className="h-4 w-4" />} label="Pickup" value={selectedJob.pickupAddress} />
                  <Detail icon={<RouteIcon className="h-4 w-4" />} label="Drop-off" value={selectedJob.dropoffAddress} />
                </div>
                <Detail icon={<MessageSquareText className="h-4 w-4" />} label="Customer" value={selectedJob.customerName} />
                {selectedJob.runnerName ? (
                  <Detail icon={<MessageSquareText className="h-4 w-4" />} label="Runner" value={selectedJob.runnerName} />
                ) : null}
                <p className="text-sm text-muted-foreground">
                  Fare N$ {selectedJob.estimatedFare} · {selectedJob.distanceKm.toFixed(1)} km
                </p>
                {selectedJob.proofPhotoUrl ? (
                  <img src={selectedJob.proofPhotoUrl} alt="Proof" className="max-h-48 w-full rounded-xl object-cover" />
                ) : null}
              </div>
            </PortalSection>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2 text-primary">{icon}</div>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
