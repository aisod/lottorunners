import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Download, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageIntro, PortalSection, StatusPill } from "@/components/portal-primitives";

export const Route = createFileRoute("/business/invoicing")({
  component: BusinessInvoicingPage,
});

const INVOICES = [
  { id: "INV-2026-092", period: "Apr 1 — Apr 30, 2026", amount: "N$ 41,200", status: "Due May 15" },
  { id: "INV-2026-088", period: "Mar 1 — Mar 31, 2026", amount: "N$ 38,950", status: "Paid" },
  { id: "INV-2026-081", period: "Feb 1 — Feb 28, 2026", amount: "N$ 36,100", status: "Paid" },
];

function BusinessInvoicingPage() {
  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Financials"
        title="Invoicing & payments"
        description="Statements, payment status, and registered billing methods for Namibian Corp."
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.2fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-border bg-primary p-6 text-primary-foreground shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/80">Current outstanding balance</p>
            <p className="mt-3 text-4xl font-black">N$ 12,450.00</p>
            <p className="mt-2 text-sm text-primary-foreground/80">Billing cycle ends in 12 days.</p>
            <Button type="button" className="mt-5 bg-white text-primary hover:bg-white/90">
              Pay now
            </Button>
          </div>

          <PortalSection title="Payment methods" description="Registered business payment instruments.">
            <div className="space-y-3">
              <MethodRow icon={CreditCard} title="Corporate Visa •••• 4242" detail="Expires 12/26" />
              <MethodRow icon={Landmark} title="Bank guarantee" detail="First National Bank" />
            </div>
          </PortalSection>
        </div>

        <PortalSection title="Invoice history" description="Download and review past statements.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-secondary/50 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Invoice ID</th>
                  <th className="px-4 py-3">Billing period</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {INVOICES.map((invoice) => (
                  <tr key={invoice.id} className="bg-white/85 hover:bg-secondary/25">
                    <td className="px-4 py-3 font-semibold">{invoice.id}</td>
                    <td className="px-4 py-3 text-muted-foreground">{invoice.period}</td>
                    <td className="px-4 py-3 font-semibold">{invoice.amount}</td>
                    <td className="px-4 py-3">
                      <StatusPill tone={invoice.status === "Paid" ? "success" : "warning"}>{invoice.status}</StatusPill>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 rounded-2xl p-5 text-primary-foreground" style={{ background: "var(--gradient-accent)" }}>
            <p className="text-lg font-bold">Smart billing insights</p>
            <p className="mt-2 text-sm text-white/85">
              Average monthly expenditure is down 12% since implementing the new routing policy.
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
    <div className="flex items-center justify-between rounded-2xl border border-border bg-white/85 px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm">
        Edit
      </Button>
    </div>
  );
}
