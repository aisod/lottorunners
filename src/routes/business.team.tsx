import { createFileRoute } from "@tanstack/react-router";
import { Mail, Plus, ShieldCheck, Users, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { PortalPageIntro, PortalSection, PortalStatTile, StatusPill } from "@/components/portal-primitives";
import { Button } from "@/components/ui/button";
import { buildBusinessRunnerPartners, computeBusinessSpendStats, formatNad } from "@/lib/portal-analytics";
import { useBusinessJobs } from "@/lib/use-business-jobs";

export const Route = createFileRoute("/business/team")({
  component: BusinessTeamPage,
});

function BusinessTeamPage() {
  const jobs = useBusinessJobs();
  const partners = useMemo(() => buildBusinessRunnerPartners(jobs), [jobs]);
  const stats = useMemo(() => computeBusinessSpendStats(jobs), [jobs]);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter(
      (p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
    );
  }, [partners, query]);

  const batches = useMemo(() => new Set(jobs.map((j) => j.batchId).filter(Boolean)).size, [jobs]);

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="People & budgets"
        title="Runner partners"
        description="Runners who have accepted or completed your corporate dispatches (from live job data)."
        action={
          <Button type="button" className="gap-2" disabled title="Team invites ship with org accounts">
            <Plus className="h-4 w-4" />
            Invite teammate
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <PortalStatTile
          icon={Users}
          label="Runner partners"
          value={String(partners.length)}
          meta="Unique runners on your jobs"
        />
        <PortalStatTile
          icon={Wallet}
          label="MTD spend"
          value={formatNad(stats.monthlySpend, true)}
          meta={`${stats.mtdJobCount} jobs`}
        />
        <PortalStatTile
          icon={Mail}
          label="Active dispatches"
          value={String(stats.activeJobs)}
          meta="In progress on marketplace"
        />
        <PortalStatTile
          icon={ShieldCheck}
          label="Bulk batches"
          value={String(batches)}
          meta="Distinct batch IDs"
        />
      </div>

      <PortalSection
        title="Directory"
        description={`${filtered.length} runners · filtered from ${partners.length} total`}
      >
        <div className="grid gap-3 md:grid-cols-[1.2fr,0.8fr]">
          <input
            type="search"
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2"
          />
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-secondary/50 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Runner</th>
                <th className="px-4 py-3">Relationship</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Jobs / spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    {partners.length === 0
                      ? "No runners have taken your jobs yet."
                      : "No matches for this search."}
                  </td>
                </tr>
              ) : (
                filtered.map((member) => (
                  <tr key={member.email} className="bg-white/85 hover:bg-secondary/25">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary">
                          {member.name
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{member.role}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={member.status.includes("active") ? "warning" : "success"}>
                        {member.status}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {member.jobCount} jobs · {formatNad(member.spend)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PortalSection>
    </div>
  );
}
