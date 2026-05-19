import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, ExternalLink, LifeBuoy, Settings2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifyUnavailable, UNAVAILABLE } from "@/lib/user-feedback";
import { PortalPageIntro, PortalSection } from "@/components/portal-primitives";

export const Route = createFileRoute("/admin/support")({
  component: AdminSupportPage,
});

const ARTICLES = [
  { title: "Incident response · P1 playbook", tag: "Ops" },
  { title: "Wallet settlement reconciliation", tag: "Finance" },
  { title: "Runner verification escalations", tag: "Trust" },
  { title: "Regional surge pricing overrides", tag: "Pricing" },
];

function AdminSupportPage() {
  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Runbooks & help"
        title="Support & knowledge base"
        description="Admin-facing help, incident playbooks, and escalation contacts."
      />

      <div className="overflow-hidden rounded-[28px] border border-border shadow-sm">
        <div className="px-8 py-12 text-primary-foreground" style={{ background: "var(--gradient-accent)" }}>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">Support hub</p>
          <h3 className="mt-3 text-4xl font-black tracking-tight">How can we help you today?</h3>
          <div className="mt-6 flex max-w-2xl items-center gap-3 rounded-full bg-white px-4 py-2 shadow-lg">
            <input
              type="search"
              placeholder="Describe your issue or search a runbook..."
              className="h-11 flex-1 bg-transparent text-sm text-foreground outline-none"
            />
            <Button
              type="button"
              disabled
              title={UNAVAILABLE.adminSupportSearch}
              onClick={() => notifyUnavailable(UNAVAILABLE.adminSupportSearch)}
            >
              Search
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CategoryCard icon={LifeBuoy} title="General FAQs" description="Answers to common platform questions." />
        <CategoryCard icon={CreditCard} title="Payment issues" description="Billing, refunds, and settlement errors." />
        <CategoryCard icon={Users} title="Runner support" description="Verification and fleet escalations." />
        <CategoryCard icon={Settings2} title="Technical assistance" description="Bug triage and configuration help." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr,0.9fr]">
        <PortalSection title="Knowledge base" description="Most-used internal articles.">
          <div className="divide-y divide-border rounded-2xl border border-border">
            {ARTICLES.map((article) => (
              <button
                key={article.title}
                type="button"
                className="flex w-full items-center justify-between gap-3 bg-white/80 px-4 py-4 text-left transition hover:bg-secondary/20 disabled:cursor-not-allowed disabled:opacity-70"
                disabled
                title={UNAVAILABLE.adminSupportArticle}
                onClick={() => notifyUnavailable(UNAVAILABLE.adminSupportArticle)}
              >
                <div>
                  <p className="font-semibold">{article.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{article.tag}</p>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </PortalSection>

        <PortalSection title="Operations desk" description="Reach the on-call admin team.">
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-semibold">Email:</span>{" "}
              <a href="mailto:ops@lottorunners.na" className="text-primary underline">
                ops@lottorunners.na
              </a>
            </p>
            <p>
              <span className="font-semibold">On-call:</span> +264 61 ••• ••••
            </p>
            <p>
              <span className="font-semibold">Coverage:</span> 24/7 critical incident handling
            </p>
          </div>
        </PortalSection>
      </div>
    </div>
  );
}

function CategoryCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof LifeBuoy;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/90 p-5 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h4 className="mt-4 font-bold">{title}</h4>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
