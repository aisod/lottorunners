export function SOSButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick ?? (() => alert("Emergency SOS triggered. Help is on the way."))}
      className="pointer-events-auto fixed right-4 z-[1300] flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-xs font-black uppercase tracking-wider text-destructive-foreground shadow-[0_8px_24px_-4px_oklch(0.55_0.22_25/0.55)] ring-4 ring-card transition-transform hover:scale-105 active:scale-95"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}
      aria-label="Emergency SOS"
    >
      SOS
    </button>
  );
}
