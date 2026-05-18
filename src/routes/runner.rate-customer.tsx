import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { RunnerBottomNav } from "@/components/runner-bottom-nav";
import { Button } from "@/components/ui/button";
import { useMarketplaceJob } from "@/lib/use-marketplace-job";

export const Route = createFileRoute("/runner/rate-customer")({
  validateSearch: (search: Record<string, unknown>) => ({
    jobId: typeof search.jobId === "string" ? search.jobId : "",
  }),
  component: RunnerRateCustomerPage,
});

function RunnerRateCustomerPage() {
  const navigate = useNavigate();
  const { jobId } = Route.useSearch();
  const job = useMarketplaceJob(jobId || null);
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState("");

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background px-5">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/runner/dashboard" })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-primary">Rate Your Customer</h1>
      </header>

      <main className="mx-auto max-w-md space-y-6 px-5 py-8">
        <section className="rounded-xl border bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Order #{job?.id.slice(-8) ?? "—"} completed · {job?.customerName ?? "Customer"}
          </p>
          <h2 className="mt-1 text-2xl font-bold">How was this customer?</h2>
          <div className="mt-5 flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className={`h-11 w-11 rounded-full text-sm font-bold ${
                  rating >= value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <label className="text-sm font-semibold">Notes (optional)</label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Share quick feedback about pickup, communication, or handover."
            className="mt-2 min-h-24 w-full rounded-lg border bg-background p-3 text-sm outline-none ring-primary/30 transition focus:ring"
          />
        </section>

        <Button
          className="h-12 w-full text-base"
          onClick={() => {
            void note;
            navigate({ to: "/runner/dashboard" });
          }}
        >
          Submit rating
        </Button>
      </main>

      <RunnerBottomNav active="home" />
    </div>
  );
}
