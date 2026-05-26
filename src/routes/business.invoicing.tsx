import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Download, Landmark } from "lucide-react";
import { useMemo } from "react";
import { PortalPageIntro, PortalSection, StatusPill } from "@/components/portal-primitives";
import { Button } from "@/components/ui/button";
import { buildBusinessInvoices, formatNad } from "@/lib/portal-analytics";
import { useBusinessJobs } from "@/lib/use-business-jobs";

export const Route = createFileRoute("/business/invoicing")({
  component: BusinessInvoicingPage,
});

function BusinessInvoicingPage() {
  const jobs = useBusinessJobs();
  const invoices = useMemo(() => buildBusinessInvoices(jobs), [jobs]);

  const outstanding = useMemo(() => {
    const open = invoices.find((i) => i.tone === "warning");
    return open?.amountNum ?? 0;
  }, [invoices]);

  const totalAllTime = useMemo(
    () => jobs.reduce((s, j) => s + j.estimatedFare, 0),
    [jobs],
  );

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Financials"
        title="Invoicing & payments"
        description="Monthly statements generated from your live dispatch history (estimated fares)."
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.2fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-border bg-primary p-6 text-primary-foreground shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/80">
              Current period (open)
            </p>
            <p className="mt-3 text-4xl font-black">{formatNad(outstanding)}</p>
            <p className="mt-2 text-sm text-primary-foreground/80">
              All-time dispatch value: {formatNad(totalAllTime)}
            </p>
          </div>

          <PortalSection title="Payment methods" description="Configure in business settings when billing integration ships.">
            <div className="space-y-3 text-sm text-muted-foreground">
              <MethodRow icon={CreditCard} title="Corporate card" detail="Not linked — add in settings" />
              <MethodRow icon={Landmark} title="Bank transfer" detail="Use billing email on file" />
            </div>
          </PortalSection>
        </div>

        <PortalSection title="Invoice history" description="One row per calendar month with dispatches.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-secondary/50 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Invoice ID</th>
                  <th className="px-4 py-3">Billing period</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Export</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No dispatches yet — invoices appear after your first bulk batch.
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="bg-white/85 hover:bg-secondary/25">
                      <td className="px-4 py-3 font-semibold">{invoice.id}</td>
                      <td className="px-4 py-3 text-muted-foreground">{invoice.period}</td>
                      <td className="px-4 py-3 font-semibold">{invoice.amount}</td>
                      <td className="px-4 py-3">
                        <StatusPill tone={invoice.tone}>{invoice.status}</StatusPill>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button type="button" variant="ghost" size="sm" className="gap-1" disabled>
                          <Download className="h-4 w-4" />
                          PDF
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 rounded-2xl p-5 text-primary-foreground" style={{ background: "var(--gradient-accent)" }}>
            <p className="text-lg font-bold">Billing insight</p>
            <p className="mt-2 text-sm text-white/85">
              {jobs.length > 0
                ? `You have ${jobs.filter((j) => j.status !== "completed").length} open dispatches and ${jobs.filter((j) => j.status === "completed").length} completed.`
                : "Create a bulk dispatch to start building invoice periods."}
            </p>
          </div>
        </PortalSection>
      </div>
    </div>
  );
}

function MethodRow({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof CreditCard;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-white/85 px-4 py-3">
      <Icon className="h-5 w-5 text-primary" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
