import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Bell, ChevronRight, Clock3, Wallet } from "lucide-react";
import { RunnerBottomNav } from "@/components/runner-bottom-nav";
import { Button } from "@/components/ui/button";

const WEEKLY_EARNINGS = [
  { day: "Mon", amount: 420, trips: 5 },
  { day: "Tue", amount: 680, trips: 8 },
  { day: "Wed", amount: 560, trips: 7 },
  { day: "Thu", amount: 910, trips: 11 },
  { day: "Fri", amount: 1240, trips: 14 },
  { day: "Sat", amount: 860, trips: 10 },
  { day: "Sun", amount: 530, trips: 6 },
];

const PAYOUT_HISTORY = [
  { title: "Weekly payout", date: "08 May 2026", amount: "N$ 4,865.50", status: "Paid" },
  { title: "Weekly payout", date: "01 May 2026", amount: "N$ 4,210.00", status: "Paid" },
  { title: "Weekly payout", date: "24 Apr 2026", amount: "N$ 3,980.75", status: "Paid" },
];

const JOB_BREAKDOWN = [
  { service: "Document delivery", completedAt: "Today • 14:15", gross: "N$ 105.00", fee: "N$ 20.00", net: "N$ 85.00" },
  { service: "Taxi ride", completedAt: "Today • 13:45", gross: "N$ 146.00", fee: "N$ 26.00", net: "N$ 120.00" },
  { service: "Errand runner", completedAt: "Today • 11:20", gross: "N$ 180.00", fee: "N$ 35.00", net: "N$ 145.00" },
];

export const Route = createFileRoute("/runner/earnings")({
  component: RunnerEarningsPage,
});

function RunnerEarningsPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const maxAmount = Math.max(...WEEKLY_EARNINGS.map((entry) => entry.amount));
  const weeklyTotal = WEEKLY_EARNINGS.reduce((sum, entry) => sum + entry.amount, 0);

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
            <SummaryCard label="Today" value="N$ 1,240" />
            <SummaryCard label="This month" value="N$ 18,920" />
            <SummaryCard label="Avg per trip" value="N$ 85" />
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
            {WEEKLY_EARNINGS.map((entry) => {
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
            {JOB_BREAKDOWN.map((job) => (
              <div key={`${job.service}-${job.completedAt}`} className="rounded-2xl border bg-secondary/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{job.service}</p>
                    <p className="text-sm text-muted-foreground">{job.completedAt}</p>
                  </div>
                  <p className="font-semibold text-primary">{job.net}</p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <MiniStat label="Gross" value={job.gross} />
                  <MiniStat label="Platform fee" value={job.fee} />
                  <MiniStat label="Net" value={job.net} />
                </div>
              </div>
            ))}
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

          <div className="space-y-3">
            {PAYOUT_HISTORY.map((payout) => (
              <div key={`${payout.title}-${payout.date}`} className="flex items-center justify-between rounded-xl border bg-secondary/20 p-4">
                <div>
                  <p className="font-semibold">{payout.title}</p>
                  <p className="text-sm text-muted-foreground">{payout.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">{payout.amount}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{payout.status}</p>
                </div>
              </div>
            ))}
          </div>
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
