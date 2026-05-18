import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Bell, GaugeCircle, ShieldCheck, Star, Timer, TriangleAlert } from "lucide-react";
import { RunnerBottomNav } from "@/components/runner-bottom-nav";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/runner/performance")({
  component: RunnerPerformancePage,
});

function RunnerPerformancePage() {
  const navigate = useNavigate();
  const router = useRouter();

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-between border-b bg-background px-5">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (router.history.canGoBack()) {
                router.history.back();
                return;
              }

              navigate({ to: "/runner/dashboard" });
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-primary">Runner Performance</h1>
        </div>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5 text-primary" />
        </Button>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-5 pb-28 pt-20">
        <section className="rounded-xl border bg-primary p-5 text-primary-foreground">
          <p className="text-sm opacity-90">Weekly score</p>
          <h2 className="text-3xl font-bold">92 / 100</h2>
          <p className="mt-1 text-sm opacity-90">Top 12% runners in Windhoek Central</p>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          <MetricCard icon={<Star className="h-5 w-5" />} label="Customer rating" value="4.9" />
          <MetricCard icon={<Timer className="h-5 w-5" />} label="Avg. pickup time" value="4m 12s" />
          <MetricCard icon={<GaugeCircle className="h-5 w-5" />} label="Acceptance rate" value="96%" />
          <MetricCard icon={<ShieldCheck className="h-5 w-5" />} label="Completion rate" value="98%" />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold">Performance tips</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>- Keep acceptance above 90% to unlock bonus zones.</li>
              <li>- Send arrival messages within the first minute.</li>
              <li>- Complete delivery proof photos on every handover.</li>
            </ul>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold">Service quality</h3>
            <div className="mt-3 space-y-3">
              <QualityRow label="On-time rate" value="94%" />
              <QualityRow label="Proof uploads" value="100% of delivery jobs" />
              <QualityRow label="Customer compliments" value="18 this week" />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <TriangleAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Account notices</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No warnings or suspension notices on your account. Keep your response time and proof uploads consistent to stay in good standing.
              </p>
            </div>
          </div>
        </section>
      </main>

      <RunnerBottomNav active="earnings" />
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function QualityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-secondary/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
