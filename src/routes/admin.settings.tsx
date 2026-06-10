import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PortalPageIntro, PortalSection } from "@/components/portal-primitives";
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
      setMessage("Settings saved.");
    });
  };

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Security posture"
        title="Settings & security"
        description="Platform settings saved to the database and shared across admin sessions."
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
        Live snapshot: {stats.activeJobs} active jobs · {stats.pendingVerifications} runners pending
        approval · {formatNadInline(stats.revenueToday)} revenue today.
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <PortalSection
          title="Maintenance"
          description="Saved for future use. Does not block the app today."
          className="lg:col-span-7"
          bodyClassName="space-y-4"
        >
          <ToggleRow
            label="Maintenance window"
            description="Mark maintenance periods. Not enforced by the app yet."
            checked={settings.maintenanceWindow}
            onChange={(v) => setSettings((s) => ({ ...s, maintenanceWindow: v }))}
            disabled={loading}
          />
          <ToggleRow
            label="API read-only mode"
            description="Mark API as read-only. Not enforced by the app yet."
            checked={settings.apiReadOnly}
            onChange={(v) => setSettings((s) => ({ ...s, apiReadOnly: v }))}
            disabled={loading}
          />
        </PortalSection>

        <PortalSection
          title="Access control"
          description="Admin sign-in policy. Not enforced by the app yet."
          className="lg:col-span-5"
          bodyClassName="space-y-4"
        >
          <ToggleRow
            label="Require MFA for admins"
            description="Require multi-factor authentication for admin sign-in. Not enforced yet."
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
              For exports, use the Supabase dashboard or your reporting tools.
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
