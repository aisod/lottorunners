import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, MapPinned, ShieldAlert, Star, Truck, UserCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LiveMapClient } from "@/components/live-map-client";
import { PortalPageIntro, PortalSection, PortalStatTile, StatusPill } from "@/components/portal-primitives";
import { WINDHOEK } from "@/lib/geo-defaults";
import { nearbyLocationsToMapRunners } from "@/lib/runner-location-service";
import {
  fetchAllRunnerLocationsRemote,
  subscribeAllRunnerLocationsRemote,
} from "@/lib/supabase/runner-locations-remote";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  buildAdminActivityFeed,
  buildTopRunners,
  computeAdminPlatformStats,
  formatNad,
} from "@/lib/portal-analytics";
import { useAdminProfiles } from "@/lib/use-admin-profiles";
import { useAllMarketplaceJobs } from "@/lib/use-all-marketplace-jobs";
import type { LatLng, Runner } from "@/lib/types";

export const Route = createFileRoute("/admin/overview")({
  component: AdminOverviewPage,
});

function AdminOverviewPage() {
  const jobs = useAllMarketplaceJobs();
  const { profiles } = useAdminProfiles();
  const [runners, setRunners] = useState<Runner[]>([]);

  const pendingVerifications = useMemo(
    () =>
      profiles.filter(
        (p) =>
          (p.roles ?? []).includes("runner") &&
          p.runner_status !== "approved" &&
          p.runner_status !== "rejected",
      ).length,
    [profiles],
  );

  const stats = useMemo(
    () => computeAdminPlatformStats(jobs, pendingVerifications),
    [jobs, pendingVerifications],
  );

  const activity = useMemo(() => buildAdminActivityFeed(jobs), [jobs]);
  const topRunners = useMemo(() => buildTopRunners(jobs), [jobs]);

  const mapCenter = useMemo((): LatLng => {
    const active = jobs.find((j) => j.status !== "completed" && j.status !== "cancelled");
    return active?.pickup ?? { lat: WINDHOEK[0], lng: WINDHOEK[1] };
  }, [jobs]);

  const pendingHotspot = useMemo(() => {
    const pending = jobs.filter((j) => j.status === "pending");
    return pending.length;
  }, [jobs]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setRunners([]);
      return;
    }

    let cancelled = false;
    const refresh = () => {
      void fetchAllRunnerLocationsRemote().then((locs) => {
        if (!cancelled) setRunners(nearbyLocationsToMapRunners(locs));
      });
    };

    refresh();
    const unsub = subscribeAllRunnerLocationsRemote(refresh);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Operations"
        title="Overview"
        description="Live runner map, recent job activity, and platform health."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <PortalSection
            title="Live map & activity"
            description="Runner locations when online, plus open job demand."
            action={
              <div className="flex flex-wrap gap-2">
                <StatusPill tone="primary">{stats.uniqueRunnersActive} runners on jobs</StatusPill>
                <StatusPill>{stats.pendingJobs} jobs pending</StatusPill>
              </div>
            }
            bodyClassName="space-y-5"
          >
            <div className="relative z-0 min-h-[240px] h-[min(50vh,420px)] overflow-hidden rounded-2xl border border-border isolate sm:min-h-[320px]">
              <LiveMapClient
                userLocation={mapCenter}
                runners={runners}
                followLocation={mapCenter}
              />
            </div>

            <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-sm">
              <p className="font-semibold text-primary">Open demand</p>
              <p className="mt-1 text-muted-foreground">
                {pendingHotspot > 0
                  ? `${pendingHotspot} jobs waiting for a runner.`
                  : "No jobs waiting for a runner."}
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[32rem] text-sm lg:min-w-0">
                <thead className="bg-secondary/50 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 sm:px-4">Event</th>
                    <th className="hidden px-3 py-3 sm:table-cell sm:px-4">Person</th>
                    <th className="hidden px-3 py-3 md:table-cell sm:px-4">Time</th>
                    <th className="px-3 py-3 sm:px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activity.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No job activity yet.
                      </td>
                    </tr>
                  ) : (
                    activity.map((row) => (
                      <tr key={row.id} className="bg-white/80 hover:bg-secondary/30">
                        <td className="max-w-[10rem] truncate px-3 py-3 font-semibold sm:max-w-none sm:px-4">{row.event}</td>
                        <td className="hidden px-3 py-3 text-muted-foreground sm:table-cell sm:px-4">{row.actor}</td>
                        <td className="hidden px-3 py-3 text-muted-foreground md:table-cell sm:px-4">{row.time}</td>
                        <td className="px-3 py-3 sm:px-4">
                          <StatusPill tone={row.tone}>{row.statusLabel}</StatusPill>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </PortalSection>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <PortalStatTile
            icon={Truck}
            label="Active jobs"
            value={String(stats.activeJobs)}
            meta={`${stats.inProgressJobs} in progress`}
            tone="primary"
          />
          <PortalStatTile
            icon={CreditCard}
            label="Revenue today"
            value={formatNad(stats.revenueToday)}
            meta="From completed jobs today"
          />
          <PortalStatTile
            icon={UserCheck}
            label="Pending verifications"
            value={String(stats.pendingVerifications)}
            meta="Runners awaiting approval"
            tone="danger"
          />

          <PortalSection title="Top performing runners" description="By completed jobs.">
            <div className="space-y-3">
              {topRunners.length === 0 ? (
                <p className="text-sm text-muted-foreground">No completed jobs yet.</p>
              ) : (
                topRunners.map((runner) => (
                  <div
                    key={runner.id}
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
                ))
              )}
            </div>
          </PortalSection>

          <div className="rounded-2xl border border-border bg-white/80 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <MapPinned className="h-4 w-4 text-primary" />
              Platform health
            </p>
            <p className="mt-2 text-muted-foreground">
              Completion rate (all time): {stats.completionRatePct}%
              {stats.avgRating != null ? ` · Avg rating ${stats.avgRating}` : ""}
            </p>
            {stats.pendingJobs > 5 ? (
              <p className="mt-2 flex items-center gap-2 text-amber-800">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                High pending count — check runner availability.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
