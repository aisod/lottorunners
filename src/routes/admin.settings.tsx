import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PortalPageIntro, PortalSection, StatusPill } from "@/components/portal-primitives";
import {
  loadAdminPlatformSettings,
  saveAdminPlatformSettings,
  type AdminPlatformSettings,
} from "@/lib/admin-platform-settings";
import { computeAdminPlatformStats } from "@/lib/portal-analytics";
import { useAdminProfiles } from "@/lib/use-admin-profiles";
import { useAllMarketplaceJobs } from "@/lib/use-all-marketplace-jobs";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const jobs = useAllMarketplaceJobs();
  const { profiles } = useAdminProfiles();
  const [settings, setSettings] = useState<AdminPlatformSettings>({
    maintenanceWindow: false,
    enforceMfa: true,
    apiReadOnly: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingVerifications = profiles.filter(
    (p) =>
      (p.roles ?? []).includes("runner") &&
      p.runner_status !== "approved" &&
      p.runner_status !== "rejected",
  ).length;
  const stats = computeAdminPlatformStats(jobs, pendingVerifications);

  useEffect(() => {
    let cancelled = false;
    void loadAdminPlatformSettings().then((loaded) => {
      if (!cancelled) {
        setSettings(loaded);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    void saveAdminPlatformSettings(settings).then((result) => {
      setSaving(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Platform settings saved to app_config.");
    });
  };

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Security posture"
        title="Settings & security"
        description="Platform flags stored in Supabase app_config (admins only). Synced across admin consoles."
        action={
          <Button type="button" onClick={save} disabled={loading || saving}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
        }
      />

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          {message}
        </p>
      ) : null}

      <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
        Live snapshot: {stats.activeJobs} active jobs · {stats.pendingVerifications} runners awaiting
        verification · {formatNadInline(stats.revenueToday)} revenue today.
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card/90 p-2 shadow-sm">
        <StatusPill tone="primary">Platform flags</StatusPill>
        <StatusPill>app_config</StatusPill>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <PortalSection
          title="Maintenance"
          description="Broadcast state to clients when maintenance mode is enabled in your edge layer."
          className="xl:col-span-7"
          bodyClassName="space-y-4"
        >
          <ToggleRow
            label="Maintenance window"
            description="Signal that non-critical writes should be degraded during deploys."
            checked={settings.maintenanceWindow}
            onChange={(v) => setSettings((s) => ({ ...s, maintenanceWindow: v }))}
            disabled={loading}
          />
          <ToggleRow
            label="API read-only mode"
            description="Advisory flag for mutating admin and partner endpoints."
            checked={settings.apiReadOnly}
            onChange={(v) => setSettings((s) => ({ ...s, apiReadOnly: v }))}
            disabled={loading}
          />
        </PortalSection>

        <PortalSection
          title="Access control"
          description="Staff authentication policy (stored for future enforcement)."
          className="xl:col-span-5"
          bodyClassName="space-y-4"
        >
          <ToggleRow
            label="Enforce MFA for L3+ admins"
            description="Require step-up auth on next console login when enforced server-side."
            checked={settings.enforceMfa}
            onChange={(v) => setSettings((s) => ({ ...s, enforceMfa: v }))}
            disabled={loading}
          />
          <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/80">
              Audit digest
            </p>
            <p className="mt-2 text-lg font-bold">
              {stats.completionRatePct}% completion · {jobs.filter((j) => j.status === "completed").length}{" "}
              completed jobs
            </p>
            <p className="mt-2 text-sm text-primary-foreground/80">
              Export tooling can read marketplace_jobs directly from Supabase for now.
            </p>
          </div>
        </PortalSection>
      </div>
    </div>
  );
}

function formatNadInline(amount: number): string {
  return `N$ ${amount.toLocaleString()}`;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
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
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-background shadow transition-transform ${checked ? "translate-x-6" : ""}`}
        />
      </button>
    </div>
  );
}
