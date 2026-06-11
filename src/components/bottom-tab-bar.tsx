import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const TABS = [
  {
    to: "/customer/home",
    label: "Home",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    ),
  },
  {
    to: "/customer/activity",
    label: "Activity",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 2" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  {
    to: "/customer/wallet",
    label: "Wallet",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="14" rx="2" />
        <path d="M16 14a2 2 0 1 1 0-4h6v4z" />
      </svg>
    ),
  },
  {
    to: "/customer/profile",
    label: "Profile",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
] as const;

export function BottomTabBar() {
  const location = useLocation();
  const path = location.pathname;

  const activeFor = (to: string) => {
    if (to === "/customer/profile") {
      return (
        path === "/customer/profile" ||
        path === "/customer/saved-addresses" ||
        path === "/customer/subscription-packages"
      );
    }
    if (to === "/customer/wallet") {
      return path === "/customer/wallet" || path === "/customer/payment-methods";
    }
    return path === to;
  };

  return (
    <nav className="pointer-events-auto fixed inset-x-0 bottom-0 z-[1200] mx-auto flex w-full max-w-xl items-stretch justify-around border-t border-border bg-card px-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-2 shadow-[0_-8px_24px_-12px_oklch(0.18_0.04_265/0.15)] lg:max-w-2xl">
      {TABS.map((t) => {
        const active = activeFor(t.to);
        return (
          <Link
            key={t.to}
            to={t.to}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors",
              active
                ? "bg-secondary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.icon}
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
