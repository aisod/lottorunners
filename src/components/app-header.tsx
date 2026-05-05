import { Link } from "@tanstack/react-router";
import logo from "@/assets/lotto-runners-logo.png";

export function AppHeader({ onHistory }: { onHistory?: () => void }) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[800] flex items-center justify-between bg-card/95 px-4 py-3 shadow-sm backdrop-blur">
      <button
        onClick={onHistory}
        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-secondary"
        aria-label="Menu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <Link to="/" className="pointer-events-auto">
        <span className="font-display text-lg font-black uppercase tracking-wider text-primary">
          Lotto Runners
        </span>
      </Link>

      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onClick={onHistory}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-secondary"
          aria-label="Notifications"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
          <img src={logo} alt="Profile" className="h-7 w-7 object-contain" />
        </div>
      </div>
    </header>
  );
}
