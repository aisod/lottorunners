import { Link } from "@tanstack/react-router";
import { LayoutDashboard, PersonStanding, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils";

type RunnerNavKey = "home" | "active" | "earnings" | "account";

const ITEMS: { key: RunnerNavKey; label: string; to: string; icon: typeof LayoutDashboard }[] = [
  { key: "home", label: "Home", to: "/runner/dashboard", icon: LayoutDashboard },
  { key: "active", label: "Active", to: "/runner/active-job", icon: PersonStanding },
  { key: "earnings", label: "Earnings", to: "/runner/earnings", icon: Wallet },
  { key: "account", label: "Account", to: "/runner/settings", icon: User },
];

export function RunnerBottomNav({ active }: { active?: RunnerNavKey }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border/80 bg-background/95 px-2 py-2.5 shadow-sheet backdrop-blur-md">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            to={item.to}
            className={cn(
              "flex flex-col items-center rounded-2xl px-3 py-1.5 text-[11px] font-semibold transition-all duration-200",
              isActive ? "bg-primary/12 text-primary shadow-sm" : "text-muted-foreground hover:bg-secondary/80",
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
