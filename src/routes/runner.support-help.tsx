import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CircleHelp, MessageCircle, Phone } from "lucide-react";
import { RunnerBottomNav } from "@/components/runner-bottom-nav";
import { notifyUnavailable, UNAVAILABLE } from "@/lib/user-feedback";

const SUPPORT_PHONE = "+264610000000";
const SUPPORT_EMAIL = "support@lottoerunners.com";

export const Route = createFileRoute("/runner/support-help")({
  component: RunnerSupportHelpPage,
});

function RunnerSupportHelpPage() {
  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background px-5">
        <Link to="/runner/settings" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-primary">Support & Help</h1>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-5 py-6">
        <SupportCard
          icon={<Phone className="h-5 w-5" />}
          title="Call support"
          subtitle={SUPPORT_PHONE}
          onClick={() => {
            window.location.href = `tel:${SUPPORT_PHONE.replace(/\s/g, "")}`;
          }}
        />
        <SupportCard
          icon={<MessageCircle className="h-5 w-5" />}
          title="Email support"
          subtitle={SUPPORT_EMAIL}
          onClick={() => {
            window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Lotto%20Runners%20runner%20support`;
          }}
        />
        <SupportCard
          icon={<CircleHelp className="h-5 w-5" />}
          title="Live chat"
          subtitle="Not available in this release"
          disabled
          titleAttr="Live chat is not available yet. Use phone or email support."
          onClick={() => notifyUnavailable("Live chat is not available yet. Use phone or email support.")}
        />
      </main>

      <RunnerBottomNav active="account" />
    </div>
  );
}

function SupportCard({
  icon,
  title,
  subtitle,
  onClick,
  disabled,
  titleAttr,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
  titleAttr?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={titleAttr}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition hover:bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">{icon}</div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </button>
  );
}
