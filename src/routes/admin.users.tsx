import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Star, UserRoundX, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PortalPageIntro, PortalSection, PortalStatTile, StatusPill } from "@/components/portal-primitives";
import { listUsersForDirectory } from "@/lib/auth-users";
import { approveRunnerAccount, rejectRunnerAccount } from "@/lib/runner-account";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  adminSetRunnerRideCategories,
  fetchProfilesForAdmin,
  type RemoteProfileRow,
} from "@/lib/supabase/profiles-remote";
import {
  formatRideCategoriesList,
  normalizeRideCategories,
  RIDE_CATEGORY_IDS,
  RIDE_CATEGORY_LABELS,
  type RideCategoryId,
} from "@/lib/ride-categories";
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
  rideCategories: RideCategoryId[] | null;
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
            ? "Pending approval"
            : "—",
      rideCategories:
        kind === "Runner"
          ? normalizeRideCategories(profile.ride_categories ?? undefined)
          : null,
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
        lastActive: "Local session",
        flag: status === "Pending" ? "Pending approval" : "—",
        rideCategories: normalizeRideCategories(),
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
        lastActive: "Local session",
        flag: "—",
        rideCategories: null,
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
      lastActive: "Local session",
      flag: "—",
      rideCategories: null,
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
  const [editingRideCategoriesId, setEditingRideCategoriesId] = useState<string | null>(null);
  const [savingRideCategoriesId, setSavingRideCategoriesId] = useState<string | null>(null);
  const rows = useMemo(() => [...pending, ...activeRows], [pending, activeRows]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All roles" | Row["kind"]>("All roles");
  const [statusFilter, setStatusFilter] = useState<"All statuses" | Row["status"]>("All statuses");

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (roleFilter !== "All roles" && row.kind !== roleFilter) return false;
      if (statusFilter !== "All statuses" && row.status !== statusFilter) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.flag.toLowerCase().includes(q)
      );
    });
  }, [rows, roleFilter, statusFilter, searchQuery]);

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

  const waitForRunnerStatus = async (
    email: string,
    expected: "approved" | "rejected",
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!isSupabaseConfigured()) return { ok: true };

    const normalized = email.trim().toLowerCase();
    for (let attempt = 0; attempt < 4; attempt++) {
      const result = await fetchProfilesForAdmin();
      if (result.ok) {
        const row = result.rows.find((p) => p.email.trim().toLowerCase() === normalized);
        if (!row) {
          return { ok: false, error: "Runner was updated but could not be reloaded from Supabase." };
        }
        if (row.runner_status === expected) return { ok: true };
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    return {
      ok: false,
      error:
        "Update saved. Refresh the page if the status looks wrong.",
    };
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
    void approveRunnerAccount(row.email).then(async (result) => {
      setActingId(null);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      const verified = await waitForRunnerStatus(row.email, "approved");
      if (!verified.ok) {
        setActionError(verified.error);
      }
      void reload();
    });
  };

  const reject = (id: string) => {
    const row = pending.find((entry) => entry.id === id);
    if (!row || row.kind !== "Runner") return;

    setActingId(id);
    setActionError(null);
    void rejectRunnerAccount(row.email).then(async (result) => {
      setActingId(null);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      const verified = await waitForRunnerStatus(row.email, "rejected");
      if (!verified.ok) {
        setActionError(verified.error);
      }
      void reload();
    });
  };

  const runnerCount = rows.filter((row) => row.kind === "Runner" && row.status === "Active").length;

  const saveRideCategories = (row: Row, categories: RideCategoryId[]) => {
    if (row.kind !== "Runner") return;
    setSavingRideCategoriesId(row.id);
    setActionError(null);
    void adminSetRunnerRideCategories(row.id, categories).then((result) => {
      setSavingRideCategoriesId(null);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setEditingRideCategoriesId(null);
      void reload();
    });
  };

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Identity & trust"
        title="User management"
        description="Approve runners and review account status."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PortalStatTile icon={Users} label="Total users" value={String(rows.length)} meta="All accounts in this project" />
        <PortalStatTile icon={ShieldCheck} label="Active runners" value={String(runnerCount)} meta="Approved to accept jobs" />
        <PortalStatTile icon={UserRoundX} label="Pending approvals" value={String(pending.length)} meta="Awaiting review or documents" />
      </div>

      <PortalSection title="Filters" description="Filter by role, status, or search.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            type="search"
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2"
          />
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as "All roles" | Row["kind"])}
            className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2"
          >
            <option>All roles</option>
            <option>Runner</option>
            <option>Customer</option>
            <option>Business</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "All statuses" | Row["status"])
            }
            className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2"
          >
            <option>All statuses</option>
            <option>Active</option>
            <option>Pending</option>
            <option>Suspended</option>
            <option>Rejected</option>
          </select>
        </div>
      </PortalSection>

      <PortalSection title="Accounts" description="Review accounts and approve pending runners.">
        {actionError ? <p className="mb-3 text-sm text-destructive">{actionError}</p> : null}
        {loadError ? <p className="mb-3 text-sm text-destructive">{loadError}</p> : null}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading accounts…</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {searchQuery || roleFilter !== "All roles" || statusFilter !== "All statuses"
              ? "No accounts match your current filters."
              : loadError
              ? "Could not load accounts. Check your connection and try again."
              : "Accounts appear here after users sign up."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm lg:min-w-0">
              <thead className="bg-secondary/50 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 sm:px-4">Name</th>
                  <th className="px-3 py-3 sm:px-4">Role</th>
                  <th className="px-3 py-3 sm:px-4">Status</th>
                  <th className="hidden px-3 py-3 md:table-cell sm:px-4">Rating</th>
                  <th className="hidden px-3 py-3 lg:table-cell sm:px-4">Last active</th>
                  <th className="hidden px-3 py-3 xl:table-cell sm:px-4">Note</th>
                  <th className="hidden px-3 py-3 lg:table-cell sm:px-4">Ride categories</th>
                  <th className="px-3 py-3 sm:px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="bg-white/80 hover:bg-secondary/30">
                    <td className="max-w-[12rem] px-3 py-3 sm:max-w-none sm:px-4">
                      <p className="truncate font-semibold">{row.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                    </td>
                    <td className="px-3 py-3 sm:px-4">{row.kind}</td>
                    <td className="px-3 py-3 sm:px-4">
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
                    <td className="hidden px-3 py-3 text-muted-foreground md:table-cell sm:px-4">{row.rating}</td>
                    <td className="hidden px-3 py-3 text-muted-foreground lg:table-cell sm:px-4">{row.lastActive}</td>
                    <td className="hidden px-3 py-3 text-muted-foreground xl:table-cell sm:px-4">{row.flag}</td>
                    <td className="hidden px-3 py-3 lg:table-cell sm:px-4">
                      {row.kind === "Runner" && row.rideCategories ? (
                        editingRideCategoriesId === row.id ? (
                          <div className="space-y-2">
                            {RIDE_CATEGORY_IDS.map((id) => {
                              const active = row.rideCategories?.includes(id);
                              return (
                                <label key={id} className="flex items-center gap-2 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={active}
                                    disabled={savingRideCategoriesId === row.id}
                                    onChange={() => {
                                      const cur = new Set(row.rideCategories ?? []);
                                      if (cur.has(id)) {
                                        if (cur.size <= 1) return;
                                        cur.delete(id);
                                      } else {
                                        cur.add(id);
                                      }
                                      saveRideCategories(row, Array.from(cur) as RideCategoryId[]);
                                    }}
                                  />
                                  {RIDE_CATEGORY_LABELS[id]}
                                </label>
                              );
                            })}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => setEditingRideCategoriesId(null)}
                            >
                              Done
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                              {formatRideCategoriesList(row.rideCategories)}
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => setEditingRideCategoriesId(row.id)}
                            >
                              Edit categories
                            </Button>
                          </div>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
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
                              {actingId === row.id ? "Saving…" : "Approve runner"}
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
                              Reject runner
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
