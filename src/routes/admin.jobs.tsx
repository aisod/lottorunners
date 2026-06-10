import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ClipboardList,
  Clock,
  MapPin,
  MessageSquareText,
  Route as RouteIcon,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PortalPageIntro, PortalSection, PortalStatTile, StatusPill } from "@/components/portal-primitives";
import { adminAssignJob, jobStatusLabel } from "@/lib/jobs-service";
import { RIDE_CATEGORY_LABELS, type RideCategoryId } from "@/lib/ride-categories";
import { useAdminProfiles } from "@/lib/use-admin-profiles";
import { useAllMarketplaceJobs } from "@/lib/use-all-marketplace-jobs";
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
  const allJobs = useAllMarketplaceJobs();
  const { profiles } = useAdminProfiles();
  const jobs = useMemo(
    () =>
      allJobs.filter(
        (j) => j.status !== "completed" && j.status !== "cancelled" && j.status !== "declined",
      ),
    [allJobs],
  );

  const [selectedJobId, setSelectedJobId] = useState("");
  const [assignRunnerEmail, setAssignRunnerEmail] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const approvedRunners = useMemo(
    () =>
      profiles.filter(
        (p) => (p.roles ?? []).includes("runner") && p.runner_status === "approved",
      ),
    [profiles],
  );
  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? null,
    [jobs, selectedJobId],
  );

  useEffect(() => {
    if (jobs.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId]);

  useEffect(() => {
    setAssignRunnerEmail("");
    setAssignError(null);
  }, [selectedJobId]);

  const pendingCount = jobs.filter((j) => j.status === "pending").length;
  const inProgressCount = jobs.filter((j) =>
    ["accepted", "en_route", "arrived", "in_progress"].includes(j.status),
  ).length;
  const delayedCount = jobs.filter(
    (j) => j.status === "pending" && Date.now() - j.createdAt > 20 * 60_000,
  ).length;

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Jobs"
        title="Active jobs"
        description="Open and in-progress jobs from customer bookings."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PortalStatTile icon={ClipboardList} label="Open jobs" value={String(jobs.length)} />
        <PortalStatTile icon={Clock} label="Pending" value={String(pendingCount)} />
        <PortalStatTile icon={Truck} label="In progress" value={String(inProgressCount)} />
        <PortalStatTile
          icon={AlertTriangle}
          label="Delayed pending"
          value={String(delayedCount)}
          meta="Waiting over 20 min"
          tone={delayedCount > 0 ? "danger" : "default"}
        />
      </div>

      {jobs.length === 0 ? (
        <PortalSection title="No open jobs">
          <p className="text-sm text-muted-foreground">
            New customer jobs will appear here as they are created.
          </p>
        </PortalSection>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <PortalSection title="Job list">
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
                      <h3 className="mt-1 line-clamp-2 font-semibold">{job.description ?? SERVICES[job.serviceType].label}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {job.customerName}
                        {job.runnerName ? ` → ${job.runnerName}` : " · No runner assigned"}
                      </p>
                    </div>
                    <StatusPill tone={statusTone(job.status)}>{jobStatusLabel(job.status)}</StatusPill>
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
                  Estimated fare: N$ {selectedJob.estimatedFare} · {selectedJob.distanceKm.toFixed(1)} km
                </p>
                {selectedJob.serviceType === "ride" && selectedJob.subType ? (
                  <p className="text-sm text-muted-foreground">
                    Ride category:{" "}
                    {RIDE_CATEGORY_LABELS[selectedJob.subType as RideCategoryId] ?? selectedJob.subType}
                  </p>
                ) : null}
                {selectedJob.status === "pending" && !selectedJob.runnerId ? (
                  <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-4">
                    <p className="text-sm font-semibold">Assign runner (admin override)</p>
                    <p className="text-xs text-muted-foreground">
                      Manually assign an approved runner. Bypasses ride-category matching.
                    </p>
                    <select
                      value={assignRunnerEmail}
                      onChange={(e) => setAssignRunnerEmail(e.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    >
                      <option value="">Select runner…</option>
                      {approvedRunners.map((runner) => (
                        <option key={runner.id} value={runner.email}>
                          {runner.display_name?.trim() || runner.email}
                        </option>
                      ))}
                    </select>
                    {assignError ? <p className="text-sm text-destructive">{assignError}</p> : null}
                    <Button
                      type="button"
                      size="sm"
                      disabled={!assignRunnerEmail || assigning}
                      onClick={() => {
                        const runner = approvedRunners.find((r) => r.email === assignRunnerEmail);
                        if (!runner) return;
                        setAssigning(true);
                        setAssignError(null);
                        void adminAssignJob(
                          selectedJob.id,
                          runner.email,
                          runner.display_name?.trim() || runner.email.split("@")[0],
                        ).then((result) => {
                          setAssigning(false);
                          if (!result.ok) {
                            setAssignError(result.message);
                            return;
                          }
                          setAssignRunnerEmail("");
                        });
                      }}
                    >
                      {assigning ? "Assigning…" : "Assign runner"}
                    </Button>
                  </div>
                ) : null}
                {selectedJob.proofPhotoUrl ? (
                  <img src={selectedJob.proofPhotoUrl} alt="Proof" className="max-h-48 w-full rounded-xl object-cover" />
                ) : null}
                {selectedJob.cargoPhotoUrls ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {Object.entries(selectedJob.cargoPhotoUrls).map(([slot, url]) =>
                      url ? (
                        <img key={slot} src={url} alt={slot} className="aspect-square w-full rounded-lg object-cover" />
                      ) : null,
                    )}
                  </div>
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
      <p className="break-words text-sm font-semibold">{value}</p>
    </div>
  );
}
