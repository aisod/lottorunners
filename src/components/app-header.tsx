import { Link } from "@tanstack/react-router";

export function AppHeader({ onHistory }: { onHistory?: () => void }) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[800] flex items-center justify-between p-3">
      <Link
        to="/"
        className="pointer-events-auto flex items-center gap-2 rounded-full bg-card/95 px-3 py-2 shadow-[var(--shadow-card)] backdrop-blur"
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-black text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          L
        </div>
        <span className="font-display text-sm font-bold tracking-tight">Lotto Runners</span>
      </Link>

      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onClick={onHistory}
          className="rounded-full bg-card/95 px-3 py-2 text-xs font-semibold shadow-[var(--shadow-card)] backdrop-blur hover:bg-secondary"
        >
          🕘 History
        </button>
      </div>
    </header>
  );
}
