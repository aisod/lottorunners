import { createFileRoute } from "@tanstack/react-router";
import { Building2, Mail, ReceiptText, ShieldCheck, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { PortalPageIntro, PortalSection } from "@/components/portal-primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/business/settings")({
  component: BusinessSettingsPage,
});

const fieldClassName =
  "mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm shadow-sm outline-none ring-primary/30 transition focus:ring-2";

function BusinessSettingsPage() {
  const [company, setCompany] = useState("Namibian Corp (Pty) Ltd");
  const [vat, setVat] = useState("4720-198-112");
  const [billingEmail, setBillingEmail] = useState("finance@namibcorp.na");
  const [costCenter, setCostCenter] = useState("WIND-OPS-01");
  const [policy, setPolicy] = useState(
    "Require secondary approval for bulk batches over N$ 25,000. Weekend rides flagged for review.",
  );
  const companyInitials =
    company
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("") || "BP";

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Configuration"
        title="Business profile"
        description="Manage the identity, billing inbox, and operating defaults used throughout the business portal."
        action={
          <Button type="button" disabled title="Business profile cloud sync is not available yet">
            Save changes (coming soon)
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.25fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-border bg-primary p-6 text-primary-foreground shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/80">
              Workspace identity
            </p>
            <div className="mt-5 flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-black">
                {companyInitials}
              </div>
              <div className="min-w-0">
                <h3 className="text-2xl font-black leading-tight">{company}</h3>
                <p className="mt-2 text-sm text-primary-foreground/80">
                  This profile carries through invoices, approver context, and dispatch-facing business pages.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
                Verified entity
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
                Billing active
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <ProfileSummaryRow icon={ReceiptText} label="VAT / tax ID" value={vat} />
              <ProfileSummaryRow icon={Mail} label="Billing inbox" value={billingEmail} />
              <ProfileSummaryRow icon={ShieldCheck} label="Default cost center" value={costCenter} />
            </div>
          </div>

          <PortalSection
            title="Profile scope"
            description="A quick view of what this business profile controls."
            bodyClassName="space-y-3"
          >
            <ProfileScopeRow
              icon={Building2}
              title="Official identity"
              detail="Registered name and VAT details feed contracts, invoices, and finance records."
            />
            <ProfileScopeRow
              icon={Mail}
              title="Billing & contact"
              detail="The finance inbox is the shared contact for statements, queries, and payment follow-up."
            />
            <ProfileScopeRow
              icon={ShieldCheck}
              title="Operational defaults"
              detail="Cost center and policy notes give reviewers extra context on new bulk requests."
            />
          </PortalSection>
        </div>

        <div className="space-y-6">
          <PortalSection
            title="Official business info"
            description="Legal details used on contracts, tax records, and customer-facing documents."
            bodyClassName="space-y-5"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  htmlFor="co-name"
                >
                  Registered name
                </label>
                <input
                  id="co-name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className={fieldClassName}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Primary legal entity name shown across the workspace.
                </p>
              </div>

              <div>
                <label
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  htmlFor="vat"
                >
                  VAT / tax ID
                </label>
                <input
                  id="vat"
                  value={vat}
                  onChange={(e) => setVat(e.target.value)}
                  className={fieldClassName}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Used on invoices and finance exports for this account.
                </p>
              </div>
            </div>
          </PortalSection>

          <PortalSection
            title="Billing & contact"
            description="Where finance communication goes and which internal reference to prefill."
            bodyClassName="space-y-5"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  htmlFor="bill-email"
                >
                  Billing email
                </label>
                <input
                  id="bill-email"
                  type="email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  className={fieldClassName}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Shared inbox for invoices, statements, and payment updates.
                </p>
              </div>

              <div>
                <label
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  htmlFor="cc"
                >
                  Default cost center code
                </label>
                <input
                  id="cc"
                  value={costCenter}
                  onChange={(e) => setCostCenter(e.target.value)}
                  className={fieldClassName}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Prefilled on new corporate requests for faster finance tagging.
                </p>
              </div>
            </div>
          </PortalSection>

          <PortalSection
            title="Approval policy"
            description="Prototype notes that travel with new bulk logistics requests."
            bodyClassName="space-y-4"
          >
            <div>
              <label
                className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                htmlFor="policy"
              >
                Spend &amp; approval policy notes
              </label>
              <textarea
                id="policy"
                value={policy}
                onChange={(e) => setPolicy(e.target.value)}
                rows={5}
                className={`${fieldClassName} min-h-[148px] resize-y`}
              />
            </div>

            <div className="rounded-2xl bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
              Keep this simple for now. It acts as a shared reviewer note rather than a rules engine.
            </div>
          </PortalSection>
        </div>
      </div>
    </div>
  );
}

function ProfileSummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/75">{label}</p>
        <p className="truncate text-sm font-semibold text-primary-foreground">{value}</p>
      </div>
    </div>
  );
}

function ProfileScopeRow({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-white/80 px-4 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
