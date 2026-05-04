import { Link } from "@tanstack/react-router";
import logo from "@/assets/lotto-runners-logo.png";

export function AppHeader({ onHistory }: { onHistory?: () => void }) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[800] flex items-center justify-between p-3">
      <Link
        to="/"
        className="pointer-events-auto flex items-center gap-2 rounded-full bg-card/95 py-1.5 pl-1.5 pr-3.5 shadow-[var(--shadow-card)] backdrop-blur"
      >
        <img
          src={logo}
          alt="Lotto Runners"
          className="h-8 w-8 object-contain"
          loading="eager"
        />
        <div className="flex flex-col leading-none">
          <span className="font-display text-[13px] font-black uppercase tracking-tight text-primary">
            Lotto Runners
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-accent">
            We run for you
          </span>
        </div>
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
