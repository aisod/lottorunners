import { notifyUnavailable, UNAVAILABLE } from "@/lib/user-feedback";

export function SOSButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      disabled={!onClick}
      title={onClick ? "Emergency SOS" : UNAVAILABLE.sos}
      onClick={onClick ?? (() => notifyUnavailable(UNAVAILABLE.sos))}
      className="rounded-full bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-60"
    >
      SOS
    </button>
  );
}
