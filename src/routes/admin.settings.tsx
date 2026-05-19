import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { notifyUnavailable, UNAVAILABLE } from "@/lib/user-feedback";
import { PortalPageIntro, PortalSection, StatusPill } from "@/components/portal-primitives";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const [maintWindow, setMaintWindow] = useState(false);
  const [enforceMfa, setEnforceMfa] = useState(true);
  const [apiReadOnly, setApiReadOnly] = useState(false);

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Security posture"
        title="Settings & security"
        description="Manage platform maintenance posture, access controls, and audit tooling."
      />

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card/90 p-2 shadow-sm">
        <StatusPill tone="primary">Personal profile</StatusPill>
        <StatusPill>Company details</StatusPill>
        <StatusPill>Security & privacy</StatusPill>
        <StatusPill>Preferences</StatusPill>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <PortalSection title="Maintenance" description="Broadcast state to clients." className="xl:col-span-7" bodyClassName="space-y-4">
          <ToggleRow
            label="Maintenance window"
            description="Degrade non-critical writes during deploys."
            checked={maintWindow}
            onChange={setMaintWindow}
          />
          <ToggleRow
            label="API read-only mode"
            description="Block mutating admin and partner endpoints."
            checked={apiReadOnly}
            onChange={setApiReadOnly}
          />
        </PortalSection>

        <PortalSection title="Access control" description="Platform staff authentication policy." className="xl:col-span-5" bodyClassName="space-y-4">
          <ToggleRow
            label="Enforce MFA for L3+ admins"
            description="Require re-authentication on the next console login."
            checked={enforceMfa}
            onChange={setEnforceMfa}
          />
          <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/80">Audit exports</p>
            <p className="mt-2 text-lg font-bold">24h security digest available</p>
            <Button
              variant="secondary"
              type="button"
              className="mt-4"
              disabled
              title={UNAVAILABLE.adminDigest}
              onClick={() => notifyUnavailable(UNAVAILABLE.adminDigest)}
            >
              Download digest
            </Button>
          </div>
        </PortalSection>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-background shadow transition-transform ${checked ? "translate-x-6" : ""}`}
        />
      </button>
    </div>
  );
}
