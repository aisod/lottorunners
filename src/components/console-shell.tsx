import { Link, useRouterState } from "@tanstack/react-router";
import {
  BriefcaseBusiness,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LineChart,
  Menu,
  Search,
  Settings,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { RoleSwitcher } from "@/components/role-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  activePrefixes?: string[];
};

const ADMIN_PRIMARY_LINKS: NavItem[] = [
  { to: "/admin/overview", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "User management", icon: Users },
  { to: "/admin/jobs", label: "Active jobs", icon: BriefcaseBusiness },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const ADMIN_SECONDARY_LINKS: NavItem[] = [
  { to: "/admin/service-pricing", label: "Service & pricing", icon: SlidersHorizontal },
  { to: "/admin/analytics", label: "Analytics", icon: LineChart },
];

const BUSINESS_LINKS: NavItem[] = [
  { to: "/business/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/business/team", label: "Team", icon: Users },
  { to: "/business/spending-analytics", label: "Spending", icon: LineChart },
  { to: "/business/invoicing", label: "Invoicing", icon: CreditCard },
  { to: "/business/settings", label: "Profile", icon: Settings },
];

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.to;
  if (item.activePrefixes?.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function ShellNav({
  pathname,
  items,
  onNavigate,
  activeClassName,
}: {
  pathname: string;
  items: NavItem[];
  onNavigate: () => void;
  activeClassName: string;
}) {
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;

        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
              active ? activeClassName : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function AdminChrome({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,rgba(0,93,152,0.06)_0%,rgba(249,249,255,1)_18%)] text-foreground">
      <div
        className={cn(
          "fixed inset-0 z-[1000] bg-foreground/40 backdrop-blur-sm transition-opacity md:hidden",
          mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!mobileNavOpen}
        onClick={() => setMobileNavOpen(false)}
      />
      <aside className={cn("fixed left-0 top-0 z-[1001] flex h-full w-64 min-h-0 flex-col border-r border-border bg-[#eef3ff] p-4 shadow-lg transition-transform md:translate-x-0", mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")}>
        <div className="mb-4 flex shrink-0 items-center justify-between md:hidden">
          <span className="text-sm font-bold text-primary">Menu</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="mb-8 px-2">
          <p className="text-lg font-black text-primary">Lotto Runners</p>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Admin Console</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <ShellNav
            pathname={pathname}
            items={ADMIN_PRIMARY_LINKS}
            onNavigate={() => setMobileNavOpen(false)}
            activeClassName="bg-primary text-primary-foreground shadow-sm"
          />
          <div className="mt-6 space-y-2">
            <p className="px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">More</p>
            <ShellNav
              pathname={pathname}
              items={ADMIN_SECONDARY_LINKS}
              onNavigate={() => setMobileNavOpen(false)}
              activeClassName="bg-primary/10 text-primary"
            />
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-border bg-white/90 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              AU
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Admin User</p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Level 4 Access</p>
            </div>
          </div>
          <Link
            to="/logout"
            onClick={() => setMobileNavOpen(false)}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Sign out
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="truncate text-lg font-black text-primary">Lotto Runners Admin</h1>
          </div>
          <div className="hidden max-w-xs flex-1 lg:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search runners, jobs, or IDs..."
                className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm outline-none ring-primary/30 focus:ring-2"
              />
            </div>
          </div>
          <div className="w-0" />
        </header>

        <main className="min-h-[calc(100dvh-4rem)] p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

function BusinessChrome({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,rgba(0,93,152,0.04)_0%,rgba(249,249,255,1)_26%)] text-foreground">
      <div
        className={cn(
          "fixed inset-0 z-[1000] bg-foreground/40 backdrop-blur-sm transition-opacity lg:hidden",
          mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!mobileNavOpen}
        onClick={() => setMobileNavOpen(false)}
      />
      <aside className={cn("fixed left-0 top-0 z-[1001] flex h-full w-64 flex-col border-r border-border bg-white p-4 shadow-lg transition-transform lg:translate-x-0", mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <span className="text-sm font-bold text-primary">Menu</span>
          <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="mb-8 rounded-2xl bg-primary p-4 text-primary-foreground shadow-sm">
          <p className="text-lg font-black">Lotto Runners</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground/80">Business Portal</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <ShellNav
            pathname={pathname}
            items={BUSINESS_LINKS}
            onNavigate={() => setMobileNavOpen(false)}
            activeClassName="bg-primary text-primary-foreground shadow-sm"
          />
        </div>
        <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-4 shadow-sm">
          <RoleSwitcher className="mb-4 border-0 bg-transparent p-0" title="Switch workspace" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              NC
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Namibian Corp</p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Client LR-9902</p>
            </div>
          </div>
          <Link
            to="/logout"
            onClick={() => setMobileNavOpen(false)}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Sign out
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center gap-3 px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <p className="text-sm font-bold text-primary">Business Portal</p>
          </div>
        </header>

        <main className="min-h-[calc(100dvh-3.5rem)] p-4 md:p-6 lg:min-h-dvh">{children}</main>
      </div>
    </div>
  );
}

export function AdminConsoleShell({ children }: { children: ReactNode }) {
  return <AdminChrome>{children}</AdminChrome>;
}

export function BusinessConsoleShell({ children }: { children: ReactNode }) {
  return <BusinessChrome>{children}</BusinessChrome>;
}
