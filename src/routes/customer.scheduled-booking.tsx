import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { CalendarClock, Check, Sparkles } from "lucide-react";
import { CustomerFixedFooter, CustomerPageShell } from "@/components/customer-page-shell";
import { CustomerFlowHeader } from "@/components/customer-flow-header";
import { Button } from "@/components/ui/button";
import { useCustomerApp } from "@/lib/customer-store";

export const Route = createFileRoute("/customer/scheduled-booking")({
  validateSearch: (search: Record<string, unknown>) => ({
    at: typeof search.at === "string" ? Number(search.at) : typeof search.at === "number" ? search.at : NaN,
    jobId: typeof search.jobId === "string" ? search.jobId : "",
  }),
  component: CustomerScheduledBookingPage,
});

function CustomerScheduledBookingPage() {
  const navigate = useNavigate();
  const { at, jobId } = Route.useSearch();
  const reset = useCustomerApp((s) => s.reset);

  const valid = Number.isFinite(at) && at > 0;

  const finish = () => {
    reset();
    navigate({ to: "/customer/home" });
  };

  if (!valid) {
    return (
      <CustomerPageShell width="md" variant="plain" className="pb-28">
        <CustomerFlowHeader title="Schedule" onBack={finish} />
        <main className="py-8 text-center text-sm text-muted-foreground">
          <p>Missing or invalid booking time.</p>
          <Button className="mt-6" onClick={finish}>
            Back to map
          </Button>
        </main>
      </CustomerPageShell>
    );
  }

  const when = format(new Date(at), "EEE d MMM yyyy, HH:mm");

  return (
    <CustomerPageShell width="md" variant="plain" className="pb-32">
      <CustomerFlowHeader title="Scheduled" bleed onBack={finish} />

      <main className="relative space-y-6 py-6">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,oklch(0.88_0.08_250/0.4),transparent)]"
          aria-hidden
        />

        <section className="overflow-hidden rounded-2xl border border-primary/15 bg-card text-center shadow-[0_12px_40px_-16px_rgba(0,93,152,0.3)]">
          <div className="relative bg-[linear-gradient(125deg,oklch(0.42_0.12_250),oklch(0.58_0.12_248))] px-6 pb-8 pt-10 text-primary-foreground">
            <div
              className="pointer-events-none absolute -left-6 top-4 h-28 w-28 rounded-full bg-white/10 blur-2xl"
              aria-hidden
            />
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/25 backdrop-blur-sm">
              <Check className="h-10 w-10" strokeWidth={2.5} aria-hidden />
            </div>
            <h1 className="relative mt-5 text-2xl font-bold tracking-tight">Request saved</h1>
            <p className="relative mx-auto mt-2 max-w-sm text-sm leading-relaxed text-primary-foreground/90">
              Your job is booked for the time below. We start matching you with a runner closer to that window so you
              are not stuck waiting now.
            </p>
          </div>

          <div className="flex items-start gap-3 p-5 text-left">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarClock className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service time</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{when}</p>
              {jobId ? (
                <p className="mt-2 truncate font-mono text-xs text-muted-foreground">Ref: {jobId}</p>
              ) : null}
            </div>
          </div>
        </section>

        <div className="flex items-start gap-2 rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p>
            Need to change something?{" "}
            <Link to="/customer/activity" className="font-medium text-primary underline-offset-4 hover:underline">
              Activity
            </Link>{" "}
            or contact support from your profile.
          </p>
        </div>
      </main>

      <CustomerFixedFooter width="md" className="border-t border-border/50 bg-background/95 backdrop-blur-md">
        <Button className="h-12 w-full text-base shadow-md" onClick={finish}>
          Back to map
        </Button>
      </CustomerFixedFooter>
    </CustomerPageShell>
  );
}
