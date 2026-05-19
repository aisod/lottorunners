import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Bell, Car, Package, ShoppingBasket } from "lucide-react";
import { RunnerBottomNav } from "@/components/runner-bottom-nav";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/runner/activity-history")({
  component: RunnerActivityHistoryPage,
});

function RunnerActivityHistoryPage() {
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
          <h1 className="text-lg font-bold text-primary">Activity History</h1>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled
          aria-label="Notifications"
          title="Notifications are not available yet"
        >
          <Bell className="h-5 w-5 text-primary opacity-50" />
        </Button>
      </header>

      <main className="mx-auto max-w-3xl space-y-3 px-5 pb-28 pt-20">
        <HistoryRow
          icon={<Package className="h-5 w-5" />}
          title="Delivery • Job #8842"
          subtitle="Completed • Today, 14:20"
          amount="N$ 185.00"
        />
        <HistoryRow
          icon={<ShoppingBasket className="h-5 w-5" />}
          title="Errand • Job #8839"
          subtitle="Completed • Today, 11:45"
          amount="N$ 320.00"
        />
        <HistoryRow
          icon={<Car className="h-5 w-5" />}
          title="Taxi • Job #8833"
          subtitle="Completed • Yesterday, 18:05"
          amount="N$ 120.00"
        />
      </main>

      <RunnerBottomNav active="home" />
    </div>
  );
}

function HistoryRow({
  icon,
  title,
  subtitle,
  amount,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  amount: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">{icon}</div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <p className="font-semibold">{amount}</p>
    </div>
  );
}
