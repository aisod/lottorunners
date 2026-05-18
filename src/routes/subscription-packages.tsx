import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/subscription-packages")({
  beforeLoad: () => {
    throw redirect({ to: "/customer/subscription-packages" });
  },
});

export function CustomerSubscriptionPackagesPage() {
  const plans = [
    { id: "solo", title: "Solo", price: "N$ 99 / month", perks: "1 user, standard support" },
    { id: "family", title: "Family", price: "N$ 179 / month", perks: "Up to 4 members" },
    { id: "pensioner", title: "Pensioner", price: "N$ 69 / month", perks: "Discounted senior package" },
  ];

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-card px-4 py-3">
        <Link to="/customer/profile" className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-secondary">←</Link>
        <h1 className="flex-1 text-center font-display text-lg font-bold text-primary">Subscription packages</h1>
        <div className="h-9 w-9" />
      </header>
      <div className="space-y-3 p-4">
        {plans.map((plan) => (
          <section key={plan.id} className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-lg font-bold">{plan.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{plan.perks}</p>
            <p className="mt-2 font-semibold text-primary">{plan.price}</p>
            <Button className="mt-3 h-10 w-full">Choose {plan.title}</Button>
          </section>
        ))}
      </div>
      <BottomTabBar />
    </div>
  );
}
