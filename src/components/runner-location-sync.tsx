import { useRunnerLocationPublisher } from "@/lib/use-runner-location-publisher";
import { getRunnerOnline } from "@/lib/runner-workflow";
import { useEffect, useState } from "react";

/** Mount under /runner layout to publish live GPS while online or on an active job. */
export function RunnerLocationSync() {
  const { error } = useRunnerLocationPublisher();
  const [online, setOnline] = useState(() => getRunnerOnline());

  useEffect(() => {
    const refresh = () => setOnline(getRunnerOnline());
    window.addEventListener("storage", refresh);
    window.addEventListener("lr-runner-online-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("lr-runner-online-changed", refresh);
    };
  }, []);

  if (!online || !error) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[1000] border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900"
    >
      {error}
    </div>
  );
}
