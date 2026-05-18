import { createFileRoute } from "@tanstack/react-router";
import { Eye, Filter, Plus, ShieldCheck, Star, UserRoundX, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PortalPageIntro, PortalSection, PortalStatTile, StatusPill } from "@/components/portal-primitives";
import { approveRunnerAccount } from "@/lib/runner-account";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

type Row = {
  id: string;
  name: string;
  email: string;
  kind: "Runner" | "Customer" | "Business";
  status: "Active" | "Pending" | "Suspended";
  rating: string;
  lastActive: string;
  flag: string;
};

const PENDING: Row[] = [
  {
    id: "u-4401",
    name: "Daniel Tjihumise",
    email: "d.tjihumise@email.na",
    kind: "Runner",
    status: "Pending",
    rating: "N/A",
    lastActive: "Not available",
    flag: "Vehicle photos",
  },
  {
    id: "u-4402",
    name: "ACME Logistics NA",
    email: "ops@acme.na",
    kind: "Business",
    status: "Pending",
    rating: "N/A",
    lastActive: "Today",
    flag: "VAT document",
  },
  {
    id: "u-4403",
    name: "Selma Iipumbu",
    email: "s.iipumbu@email.na",
    kind: "Customer",
    status: "Pending",
    rating: "N/A",
    lastActive: "Yesterday",
    flag: "ID mismatch",
  },
];

const ACTIVE: Row[] = [
  { id: "u-1201", name: "Helena Nangolo", email: "h.n@email.na", kind: "Runner", status: "Active", rating: "4.9", lastActive: "2 mins ago", flag: "—" },
  { id: "u-1202", name: "Johannes N.", email: "j.n@email.na", kind: "Customer", status: "Active", rating: "5.0", lastActive: "1 hour ago", flag: "—" },
  { id: "u-1203", name: "Petrus Titus", email: "p.t@email.na", kind: "Customer", status: "Suspended", rating: "3.2", lastActive: "2 months ago", flag: "Chargeback" },
];

function AdminUsersPage() {
  const [pending, setPending] = useState(PENDING);
  const [activeRows, setActiveRows] = useState(ACTIVE);
  const rows = useMemo(() => [...pending, ...activeRows], [pending, activeRows]);

  const showRow = (row: Row) => {
    window.alert(
      `${row.name} (${row.kind})\n${row.email}\nStatus: ${row.status}\nFlag: ${row.flag}\n\nDemo directory view only.`,
    );
  };

  const approve = (id: string) => {
    const row = pending.find((entry) => entry.id === id);
    if (!row) return;
    if (row.kind === "Runner") {
      approveRunnerAccount(row.email);
    }
    setPending((entries) => entries.filter((entry) => entry.id !== id));
    setActiveRows((entries) => [
      {
        ...row,
        status: "Active",
        rating: row.kind === "Runner" ? "4.7" : "5.0",
        lastActive: "Just now",
        flag: "—",
      },
      ...entries,
    ]);
  };

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Identity & trust"
        title="User management"
        description="Review runner approvals, suspend risky accounts, and track user health across the platform."
        action={
          <Button type="button" className="gap-2" onClick={() => window.alert("User creation is simulated in this demo.")}>
            <Plus className="h-4 w-4" />
            Add new user
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <PortalStatTile icon={Users} label="Total users" value="12,482" meta="Across customer, runner, and business personas" />
        <PortalStatTile icon={ShieldCheck} label="Active runners" value="1,240" meta="Verified for dispatch" />
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-secondary/50 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Rating</th>
                <th className="px-4 py-3">Last active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id} className="bg-white/85 hover:bg-secondary/25">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary">
                        {row.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{row.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={row.kind === "Runner" ? "primary" : row.kind === "Business" ? "warning" : "neutral"}>{row.kind}</StatusPill>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={row.status === "Active" ? "success" : row.status === "Pending" ? "warning" : "danger"}>
                      {row.status}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 font-semibold">
                      {row.rating}
                      {row.rating !== "N/A" ? <Star className="h-4 w-4 fill-current text-primary" /> : null}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.lastActive}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`View ${row.name}`}
                        type="button"
                        onClick={() => showRow(row)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {row.status === "Pending" ? (
                        <Button size="sm" type="button" onClick={() => approve(row.id)}>
                          Approve
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" type="button" onClick={() => showRow(row)}>
                          Review
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PortalSection>
    </div>
  );
}
