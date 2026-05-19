import { createFileRoute } from "@tanstack/react-router";
import { Mail, Plus, ShieldCheck, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifyUnavailable, UNAVAILABLE } from "@/lib/user-feedback";
import { PortalPageIntro, PortalSection, PortalStatTile, StatusPill } from "@/components/portal-primitives";

export const Route = createFileRoute("/business/team")({
  component: BusinessTeamPage,
});

const MEMBERS = [
  { name: "Helena Nangolo", email: "h.nangolo@namibcorp.na", role: "Fleet lead", status: "Active" },
  {
    name: "Johannes Shilongo",
    email: "j.shilongo@namibcorp.na",
    role: "Dispatcher",
    status: "Active",
  },
  {
    name: "Laura Brandt",
    email: "l.brandt@namibcorp.na",
    role: "Finance",
    status: "Pending invite",
  },
  {
    name: "Daniel Tjihumise",
    email: "d.tjihumise@namibcorp.na",
    role: "Analyst",
    status: "Active",
  },
];

function BusinessTeamPage() {
  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="People & budgets"
        title="Team management"
        description="Manage corporate delegates, set spend limits, and monitor errand activity."
        action={
          <Button
            type="button"
            className="gap-2"
            disabled
            title={UNAVAILABLE.teamInvite}
            onClick={() => notifyUnavailable(UNAVAILABLE.teamInvite)}
          >
            <Plus className="h-4 w-4" />
            Add new member
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <PortalStatTile icon={Users} label="Total members" value="124" meta="+12% this month" />
        <PortalStatTile icon={Wallet} label="Monthly limit" value="N$ 24,500" meta="Across all active team members" />
        <PortalStatTile icon={Mail} label="Active requests" value="18" meta="Awaiting runner completion" />
        <PortalStatTile icon={ShieldCheck} label="Limit alerts" value="3" meta="Policy thresholds exceeded" />
      </div>

      <PortalSection title="Directory" description={`${MEMBERS.length} people · Namibian Corp workspace`}>
        <div className="grid gap-3 md:grid-cols-[1.2fr,0.8fr,0.8fr]">
          <input
            type="search"
            placeholder="Search by name or email..."
            className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2"
          />
          <select className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2">
            <option>All departments</option>
            <option>Operations</option>
            <option>Finance</option>
            <option>Dispatch</option>
          </select>
          <select className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2">
            <option>All statuses</option>
            <option>Active</option>
            <option>Pending invite</option>
          </select>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-secondary/50 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Role / Department</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Spend limit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MEMBERS.map((member, index) => (
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
                    <p className="text-xs text-muted-foreground">{index % 2 === 0 ? "Operations" : "Finance"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={member.status === "Active" ? "success" : "warning"}>{member.status}</StatusPill>
                  </td>
                  <td className="px-4 py-3 font-semibold">{index % 2 === 0 ? "N$ 5,000" : "N$ 1,200"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PortalSection>
    </div>
  );
}
