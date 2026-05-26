import { createFileRoute } from "@tanstack/react-router";
import { Eye, Filter, Plus, ShieldCheck, Star, UserRoundX, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PortalPageIntro, PortalSection, PortalStatTile, StatusPill } from "@/components/portal-primitives";
import { listUsersForDirectory } from "@/lib/auth-users";
import { approveRunnerAccount, rejectRunnerAccount } from "@/lib/runner-account";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchProfilesForAdmin, type RemoteProfileRow } from "@/lib/supabase/profiles-remote";
import { refreshAuthSessionFromProfile } from "@/lib/auth-users";
import { runnerAvgRatingFromJobs } from "@/lib/portal-analytics";
import { useAllMarketplaceJobs } from "@/lib/use-all-marketplace-jobs";
import type { MarketplaceJob } from "@/lib/jobs-types";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

type Row = {
  id: string;
  name: string;
  email: string;
  kind: "Runner" | "Customer" | "Business";
  status: "Active" | "Pending" | "Suspended" | "Rejected";
  rating: string;
  lastActive: string;
  flag: string;
};

function mapRunnerStatus(status?: string | null): Row["status"] {
  if (status === "approved") return "Active";
  if (status === "rejected") return "Rejected";
  if (status === "pending_verification" || status === "in_progress") return "Pending";
  if (status === "suspended") return "Suspended";
  return "Pending";
}

function profileToRows(
  profiles: RemoteProfileRow[],
  jobs: MarketplaceJob[],
): { pending: Row[]; active: Row[] } {
  const pending: Row[] = [];
  const active: Row[] = [];

  for (const profile of profiles) {
    const roles = profile.roles ?? [];
    const kind: Row["kind"] = roles.includes("business")
      ? "Business"
      : roles.includes("runner")
        ? "Runner"
        : "Customer";

    const row: Row = {
      id: profile.id,
      name: profile.display_name?.trim() || profile.email,
      email: profile.email,
      kind,
      status: kind === "Runner" ? mapRunnerStatus(profile.runner_status) : "Active",
      rating:
        kind === "Runner" && profile.runner_status === "approved"
          ? runnerAvgRatingFromJobs(profile.email, jobs)
          : "N/A",
      lastActive: profile.updated_at ? new Date(profile.updated_at).toLocaleString() : "—",
      flag:
        kind === "Runner" && profile.runner_status === "rejected"
          ? "Application rejected"
          : kind === "Runner" && profile.runner_status !== "approved"
            ? "Onboarding review"
            : "—",
    };

    if (row.status === "Pending") pending.push(row);
    else if (row.status === "Rejected") active.push(row);
    else active.push(row);
  }

  return { pending, active };
}

function localUsersToRows(jobs: MarketplaceJob[]): { pending: Row[]; active: Row[] } {
  const pending: Row[] = [];
  const active: Row[] = [];

  for (const user of listUsersForDirectory()) {
    if (user.roles.includes("runner")) {
      const status = mapRunnerStatus(user.runnerStatus);
      const row: Row = {
        id: user.email,
        name: user.displayName,
        email: user.email,
        kind: "Runner",
        status,
        rating: status === "Active" ? runnerAvgRatingFromJobs(user.email, jobs) : "N/A",
        lastActive: "This device",
        flag: status === "Pending" ? "Onboarding review" : "—",
      };
      if (status === "Pending") pending.push(row);
      else active.push(row);
      continue;
    }

    if (user.roles.includes("business")) {
      active.push({
        id: user.email,
        name: user.displayName,
        email: user.email,
        kind: "Business",
        status: "Active",
        rating: "N/A",
        lastActive: "This device",
        flag: "—",
      });
      continue;
    }

    active.push({
      id: user.email,
      name: user.displayName,
      email: user.email,
      kind: "Customer",
      status: "Active",
      rating: "N/A",
      lastActive: "This device",
      flag: "—",
    });
  }

  return { pending, active };
}

function AdminUsersPage() {
  const jobs = useAllMarketplaceJobs();
  const [pending, setPending] = useState<Row[]>([]);
  const [activeRows, setActiveRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const rows = useMemo(() => [...pending, ...activeRows], [pending, activeRows]);

  const reload = async () => {
    setLoading(true);
    setActionError(null);
    setLoadError(null);
    if (isSupabaseConfigured()) {
      const result = await fetchProfilesForAdmin();
      if (!result.ok) setLoadError(result.error);
      const mapped = profileToRows(result.rows, jobs);
      setPending(mapped.pending);
      setActiveRows(mapped.active);
      setLoading(false);
      return;
    }
    const mapped = localUsersToRows(jobs);
    setPending(mapped.pending);
    setActiveRows(mapped.active);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (isSupabaseConfigured()) {
        await refreshAuthSessionFromProfile(true);
      }
      if (!cancelled) await reload();
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh ratings when job data changes
  }, [jobs]);

  const approve = (id: string) => {
    const row = pending.find((entry) => entry.id === id);
    if (!row || row.kind !== "Runner") return;

    setActingId(id);
    setActionError(null);
    void approveRunnerAccount(row.email).then((result) => {
      setActingId(null);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      void reload();
    });
  };

  const reject = (id: string) => {
    const row = pending.find((entry) => entry.id === id);
    if (!row || row.kind !== "Runner") return;

    setActingId(id);
    setActionError(null);
    void rejectRunnerAccount(row.email).then((result) => {
      setActingId(null);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      void reload();
    });
  };

  const runnerCount = rows.filter((row) => row.kind === "Runner" && row.status === "Active").length;

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Identity & trust"
        title="User management"
        description="Review runner approvals, suspend risky accounts, and track user health across the platform."
        action={
          <Button type="button" className="gap-2" disabled title="User creation is managed through sign-up flows">
            <Plus className="h-4 w-4" />
            Add new user
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <PortalStatTile icon={Users} label="Total users" value={String(rows.length)} meta="Registered accounts in your environment" />
        <PortalStatTile icon={ShieldCheck} label="Active runners" value={String(runnerCount)} meta="Approved for dispatch" />
        <PortalStatTile icon={UserRoundX} label="Pending approvals" value={String(pending.length)} meta="Awaiting review or documents" />
      </div>

      <PortalSection
        title="Directory controls"
        description="Filter by persona, approval status, and quality signals."
        action={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            More filters
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-[1.3fr,0.8fr,0.8fr]">
          <input
            type="search"
            placeholder="Search runners, customers, or companies..."
            className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2"
          />
          <select className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2">
            <option>All roles</option>
            <option>Runner</option>
            <option>Customer</option>
            <option>Business</option>
          </select>
          <select className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2">
            <option>All statuses</option>
            <option>Active</option>
            <option>Pending</option>
            <option>Suspended</option>
          </select>
        </div>
      </PortalSection>

      <PortalSection title="Platform directory" description="Moderate access and review each account’s current state.">
        {actionError ? <p className="mb-3 text-sm text-destructive">{actionError}</p> : null}
        {loadError ? <p className="mb-3 text-sm text-destructive">{loadError}</p> : null}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading accounts…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {loadError
              ? "Could not load accounts from Supabase."
              : "No accounts yet. Users appear here after they sign up on this device or in your Supabase project."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-secondary/50 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Last active</th>
                  <th className="px-4 py-3">Flag</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id} className="bg-white/80 hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.email}</p>
                    </td>
                    <td className="px-4 py-3">{row.kind}</td>
                    <td className="px-4 py-3">
                      <StatusPill
                        tone={
                          row.status === "Active"
                            ? "success"
                            : row.status === "Pending"
                              ? "warning"
                              : row.status === "Rejected"
                                ? "danger"
                                : "danger"
                        }
                      >
                        {row.status}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.rating}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.lastActive}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.flag}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" className="gap-1" disabled>
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                        {row.status === "Pending" && row.kind === "Runner" ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              className="gap-1"
                              disabled={actingId === row.id}
                              onClick={() => approve(row.id)}
                            >
                              <Star className="h-3.5 w-3.5" />
                              {actingId === row.id ? "Saving…" : "Approve"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              disabled={actingId === row.id}
                              onClick={() => reject(row.id)}
                            >
                              <UserRoundX className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PortalSection>
    </div>
  );
}
