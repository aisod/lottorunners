import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { CustomerPageShell } from "@/components/customer-page-shell";
import { formatWalletBalance } from "@/lib/customer-wallet";
import { notifyUnavailable, UNAVAILABLE } from "@/lib/user-feedback";

export const Route = createFileRoute("/wallet")({
  beforeLoad: () => {
    throw redirect({ to: "/customer/wallet" });
  },
});

export function CustomerWalletPage() {
  return (
    <CustomerPageShell width="md" variant="plain" tabBar>
      <header className="sticky top-0 z-10 -mx-4 flex items-center gap-2 border-b border-border bg-card px-4 py-3 sm:-mx-6 sm:px-6">
        <Link to="/customer/home" className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-secondary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </Link>
        <h1 className="flex-1 text-center font-display text-lg font-bold text-primary">Wallet</h1>
        <div className="h-9 w-9" />
      </header>

      <div className="p-4">
        <div className="rounded-3xl bg-primary p-6 text-primary-foreground shadow-[0_10px_30px_-10px_oklch(0.546_0.15_258/0.45)]">
          <div className="text-xs font-medium uppercase tracking-wider opacity-80">Balance</div>
          <div className="mt-1 text-4xl font-black">{formatWalletBalance()}</div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-xl bg-card py-2.5 text-sm font-bold text-primary opacity-80"
              aria-label={UNAVAILABLE.walletTopUp}
              onClick={() => notifyUnavailable(UNAVAILABLE.walletTopUp)}
            >
              + Top up
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl border border-primary-foreground/30 py-2.5 text-sm font-semibold opacity-80"
              aria-label={UNAVAILABLE.walletSend}
              onClick={() => notifyUnavailable(UNAVAILABLE.walletSend)}
            >
              Send
            </button>
          </div>
        </div>

        <h2 className="mt-6 mb-2 text-sm font-bold">Recent transactions</h2>
        <ul className="space-y-2">
          {[
            { label: "Personal Shopper", date: "Today, 10:32", amount: -85 },
            { label: "Top up — MTC MoMo", date: "Yesterday", amount: 200 },
            { label: "Ride to Maerua Mall", date: "Mon, 14:05", amount: -45 },
          ].map((tx, i) => (
            <li key={i} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
              <div>
                <div className="font-semibold">{tx.label}</div>
                <div className="text-xs text-muted-foreground">{tx.date}</div>
              </div>
              <div className={tx.amount < 0 ? "font-bold" : "font-bold text-primary"}>
                {tx.amount < 0 ? "−" : "+"}N$ {Math.abs(tx.amount)}.00
              </div>
            </li>
          ))}
        </ul>
      </div>

      <BottomTabBar />
    </CustomerPageShell>
  );
}
