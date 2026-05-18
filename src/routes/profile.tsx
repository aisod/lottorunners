import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { CustomerPageShell } from "@/components/customer-page-shell";
import { Button } from "@/components/ui/button";
import { RoleSwitcher } from "@/components/role-switcher";
import logo from "@/assets/lotto-runners-logo.png";
import { getAuthSession } from "@/lib/auth-session";
import { getUserDisplayName, getUserPhone, updateUserPhone } from "@/lib/auth-users";
import { formatPhoneDisplay } from "@/lib/phone-utils";

export const Route = createFileRoute("/profile")({
  beforeLoad: () => {
    throw redirect({ to: "/customer/profile" });
  },
});

export function CustomerProfilePage() {
  const profileName = useMemo(() => getUserDisplayName() ?? "Guest", []);
  const sessionEmail = useMemo(() => getAuthSession()?.email ?? "", []);
  const [savedPhone, setSavedPhone] = useState<string | null>(() => getUserPhone());
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const phoneLabel = savedPhone ? formatPhoneDisplay(savedPhone) : "Add mobile number";

  const startPhoneEdit = () => {
    setPhoneDraft(savedPhone ? formatPhoneDisplay(savedPhone) : "");
    setPhoneError(null);
    setEditingPhone(true);
  };

  const savePhone = () => {
    setPhoneError(null);
    if (!updateUserPhone(phoneDraft)) {
      setPhoneError("Enter a valid Namibia mobile number (e.g. 081 123 4567).");
      return;
    }
    setSavedPhone(getUserPhone());
    setEditingPhone(false);
  };

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
            <div className="text-sm text-muted-foreground">{phoneLabel}</div>
            <div className="text-xs text-muted-foreground">{sessionEmail}</div>
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

        {editingPhone ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-bold">Update mobile number</p>
            <input
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              type="tel"
              autoComplete="tel"
              placeholder="081 123 4567"
              className="mt-3 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none ring-primary/30 focus:ring"
            />
            {phoneError ? <p className="mt-2 text-sm text-destructive">{phoneError}</p> : null}
            <div className="mt-3 flex gap-2">
              <Button className="flex-1" onClick={savePhone}>
                Save
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditingPhone(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        <h2 className="mt-6 mb-2 text-sm font-bold">Account</h2>
        <ul className="space-y-2">
          <Row label="Phone number" onPress={startPhoneEdit} />
          <Row label="Email" value={sessionEmail || "Not signed in"} />
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
  value,
  destructive,
  onPress,
}: {
  label: string;
  value?: string;
  destructive?: boolean;
  onPress?: () => void;
}) {
  if (value) {
    return (
      <li className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <span className="font-semibold">{label}</span>
        <span className="text-sm text-muted-foreground">{value}</span>
      </li>
    );
  }

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
