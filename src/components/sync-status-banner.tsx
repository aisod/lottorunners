import { getCrossDeviceMessage } from "@/lib/platform-sync";

export function SyncStatusBanner() {
  const message = getCrossDeviceMessage();
  if (!message) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950"
    >
      {message}
    </div>
  );
}
