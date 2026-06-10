import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { BottomTabBar } from "@/components/bottom-tab-bar";

export const Route = createFileRoute("/saved-addresses")({
  beforeLoad: () => {
    throw redirect({ to: "/customer/saved-addresses" });
  },
});

export function CustomerSavedAddressesPage() {
  return (
    <div className="min-h-dvh bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-card px-4 py-3">
        <Link to="/customer/profile" className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-secondary">←</Link>
        <h1 className="flex-1 text-center font-display text-lg font-bold text-primary">Saved addresses</h1>
        <div className="h-9 w-9" />
      </header>
      <div className="space-y-3 p-4">
        <AddressRow label="Home" sub="123 Independence Ave, Windhoek" />
        <AddressRow label="Work" sub="Maerua Mall, Windhoek" />
      </div>
      <BottomTabBar />
    </div>
  );
}

function AddressRow({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="font-semibold">{label}</p>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}
