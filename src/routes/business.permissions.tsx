import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PortalPageIntro, PortalSection, StatusPill } from "@/components/portal-primitives";

export const Route = createFileRoute("/business/permissions")({
  component: BusinessPermissionsPage,
});

type PermKey = "bulk" | "analytics" | "billing" | "team";

const ROWS: { key: PermKey; label: string; description: string }[] = [
  {
    key: "bulk",
    label: "Create bulk requests",
    description: "Submit multi-stop logistics batches",
  },
  {
    key: "analytics",
    label: "View spending analytics",
    description: "Department and employee spend dashboards",
  },
  {
    key: "billing",
    label: "Manage invoicing & payments",
    description: "Statements, methods, and settlements",
  },
  { key: "team", label: "Manage team & permissions", description: "Invite users and assign roles" },
];

function BusinessPermissionsPage() {
  const [matrix, setMatrix] = useState({
    Fleet: { bulk: true, analytics: true, billing: false, team: false },
    Finance: { bulk: false, analytics: true, billing: true, team: false },
    Analyst: { bulk: false, analytics: true, billing: false, team: false },
  });

  const toggle = (role: keyof typeof matrix, key: PermKey) => {
    setMatrix((m) => ({
      ...m,
      [role]: { ...m[role], [key]: !m[role][key] },
    }));
  };

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Access controls"
        title="Manage permissions"
        description="Control access levels for corporate fleet operators and finance delegates."
      />

      <PortalSection title="Permission matrix" description="Role templates across the business portal.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-secondary/50 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Role</th>
                {ROWS.map((row) => (
                  <th key={row.key} className="px-4 py-3 text-center">
                    {row.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(Object.keys(matrix) as (keyof typeof matrix)[]).map((role) => (
                <tr key={role} className="bg-white/85 hover:bg-secondary/25">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-semibold">{role}</p>
                      <p className="text-xs text-muted-foreground">
                        {role === "Fleet" ? "Dispatch team" : role === "Finance" ? "Billing owners" : "Reporting only"}
                      </p>
                    </div>
                  </td>
                  {ROWS.map((row) => (
                    <td key={row.key} className="px-4 py-4 text-center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={matrix[role][row.key]}
                        onClick={() => toggle(role, row.key)}
                        className={`relative h-8 w-14 rounded-full transition-colors ${matrix[role][row.key] ? "bg-primary" : "bg-muted"}`}
                      >
                        <span
                          className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-background shadow transition-transform ${matrix[role][row.key] ? "translate-x-6" : ""}`}
                        />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <StatusPill tone="primary">Bulk ordering</StatusPill>
          <StatusPill>Billing access</StatusPill>
          <StatusPill>Team management</StatusPill>
        </div>
      </PortalSection>

    </div>
  );
}
