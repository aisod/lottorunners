import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Bell, ChevronRight, Clock3, Wallet } from "lucide-react";
import { RunnerBottomNav } from "@/components/runner-bottom-nav";
import { Button } from "@/components/ui/button";
import {
  getRunnerEarningsRows,
  getRunnerEarningsSummary,
  getWeeklyEarningsBars,
} from "@/lib/runner-earnings";
import { SERVICES } from "@/lib/services";

export const Route = createFileRoute("/runner/earnings")({
  component: RunnerEarningsPage,
});

function RunnerEarningsPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const summary = getRunnerEarningsSummary();
  const weeklyEarnings = getWeeklyEarningsBars();
  const jobRows = getRunnerEarningsRows();
  const maxAmount = Math.max(1, ...weeklyEarnings.map((entry) => entry.amount));
  const weeklyTotal = summary.week;

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
          <h1 className="text-lg font-bold text-primary">Runner Earnings</h1>
        </div>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5 text-primary" />
        </Button>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-5 pb-28 pt-20">
        <section className="rounded-xl border bg-primary p-5 text-primary-foreground">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm opacity-90">This week</p>
              <h2 className="mt-1 text-3xl font-bold">N$ {weeklyTotal.toFixed(2)}</h2>
              <p className="mt-1 text-sm opacity-90">Weekly performance charts and payout history</p>
            </div>
            <div className="rounded-2xl bg-primary-foreground/10 p-3">
              <Wallet className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Today" value={`N$ ${summary.today.toFixed(2)}`} />
            <SummaryCard label="This month" value={`N$ ${summary.month.toFixed(2)}`} />
            <SummaryCard label="Avg per trip" value={`N$ ${summary.avgPerTrip.toFixed(2)}`} />
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Weekly performance</h2>
              <p className="text-sm text-muted-foreground">Track daily earnings across the current payout cycle.</p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
              onClick={() => navigate({ to: "/runner/performance" })}
            >
              Performance
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-7 items-end gap-3">
            {weeklyEarnings.map((entry) => {
              const height = Math.max(28, Math.round((entry.amount / maxAmount) * 160));

              return (
                <div key={entry.day} className="flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">N$ {entry.amount}</span>
                  <div className="flex h-44 w-full items-end justify-center rounded-2xl bg-secondary/40 px-2 py-3">
                    <div className="w-full rounded-xl bg-primary shadow-sm" style={{ height }} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold">{entry.day}</p>
                    <p className="text-[11px] text-muted-foreground">{entry.trips} trips</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Per-job breakdown</h2>
              <p className="text-sm text-muted-foreground">Net earnings after platform commission for your latest jobs.</p>
            </div>
          </div>

          <div className="space-y-3">
            {jobRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Complete jobs to see earnings breakdown here.</p>
            ) : (
              jobRows.map((row) => (
                <div key={row.job.id} className="rounded-2xl border bg-secondary/20 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{SERVICES[row.job.serviceType].label}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(row.job.completedAt ?? row.job.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="font-semibold text-primary">N$ {row.net.toFixed(2)}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                    <MiniStat label="Gross" value={`N$ ${row.gross.toFixed(2)}`} />
                    <MiniStat label="Platform fee" value={`N$ ${row.fee.toFixed(2)}`} />
                    <MiniStat label="Net" value={`N$ ${row.net.toFixed(2)}`} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-primary" />
            <div>
              <h2 className="font-semibold">Payout history</h2>
              <p className="text-sm text-muted-foreground">Recent transfers to your runner wallet and payout account.</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Automated bank payouts will appear here once payout processing is connected to your runner account.
          </p>
        </section>
      </main>

      <RunnerBottomNav active="earnings" />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-primary-foreground/10 p-4">
      <p className="text-xs opacity-85">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2">
      <p className="font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
