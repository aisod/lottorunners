import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMemo } from "react";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { CustomerPageShell } from "@/components/customer-page-shell";
import { RoleSwitcher } from "@/components/role-switcher";
import logo from "@/assets/lotto-runners-logo.png";
import { getAuthSession } from "@/lib/auth-session";
import { getUserDisplayName } from "@/lib/auth-users";

export const Route = createFileRoute("/profile")({
  beforeLoad: () => {
    throw redirect({ to: "/customer/profile" });
  },
});

export function CustomerProfilePage() {
  const profileName = useMemo(() => getUserDisplayName() ?? "Guest", []);
  const sessionEmail = useMemo(() => getAuthSession()?.email ?? "", []);

  return (
    <CustomerPageShell width="md" variant="plain" tabBar className="pb-24">
      <header className="sticky top-0 z-10 -mx-4 flex items-center gap-2 border-b border-border bg-card px-4 py-3 sm:-mx-6 sm:px-6">
        <Link
          to="/customer/home"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-secondary"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="flex-1 text-center font-display text-lg font-bold text-primary">Profile</h1>
        <div className="h-9 w-9" />
      </header>

      <div className="p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary">
            <img src={logo} alt="" className="h-12 w-12 object-contain" />
          </div>
          <div>
            <div className="text-lg font-bold">{profileName}</div>
            <div className="text-sm text-muted-foreground">{sessionEmail || "+264 81 ••• ••••"}</div>
          </div>
        </div>

        <RoleSwitcher className="mt-4" />

        <h2 className="mt-6 mb-2 text-sm font-bold">Saved Places</h2>
        <ul className="space-y-2">
          <li>
            <Link to="/customer/saved-addresses" className="block">
              <PlaceRow label="Home" sub="123 Independence Ave, Windhoek" />
            </Link>
          </li>
          <li>
            <Link to="/customer/saved-addresses" className="block">
              <PlaceRow label="Work" sub="Maerua Mall, Windhoek" />
            </Link>
          </li>
        </ul>

        <h2 className="mt-6 mb-2 text-sm font-bold">Account</h2>
        <ul className="space-y-2">
          <Row label="Phone number" onPress={() => window.alert("Phone: +264 81 123 4567 (demo)")} />
          <Row label="Email" onPress={() => window.alert(`Email: ${sessionEmail || "guest@local"} (demo)`)} />
          <Row label="Privacy & security" onPress={() => window.alert("Privacy settings are coming soon.")} />
          <li>
            <Link
              to="/customer/subscription-packages"
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
            >
              <span className="font-semibold">Subscription packages</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-muted-foreground"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </li>
          <li>
            <Link
              to="/logout"
              className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left text-destructive"
            >
              <span className="font-semibold">Sign out</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-muted-foreground"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </li>
        </ul>
      </div>

      <BottomTabBar />
    </CustomerPageShell>
  );
}

function PlaceRow({ label, sub }: { label: string; sub: string }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{label}</div>
        <div className="truncate text-xs text-muted-foreground">{sub}</div>
      </div>
    </li>
  );
}

function Row({
  label,
  destructive,
  onPress,
}: {
  label: string;
  destructive?: boolean;
  onPress?: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onPress}
        className={`flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left ${destructive ? "text-destructive" : ""}`}
      >
      <span className="font-semibold">{label}</span>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-muted-foreground"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
      </button>
    </li>
  );
}
