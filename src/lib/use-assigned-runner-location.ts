import { useEffect, useState } from "react";
import {
  formatLocationFreshness,
  isLocationFresh,
  runnerLocationToMapRunner,
  subscribeRunnerLocation,
} from "./runner-location-service";
import type { MarketplaceJob } from "./jobs-types";
import type { Runner } from "./types";

export function useAssignedRunnerLocation(job: MarketplaceJob | null): {
  runner: Runner | null;
  freshnessLabel: string | null;
  waitingForGps: boolean;
} {
  const runnerEmail = job?.runnerEmail ?? job?.runnerId ?? null;
  const [runner, setRunner] = useState<Runner | null>(null);
  const [freshnessLabel, setFreshnessLabel] = useState<string | null>(null);
  const [waitingForGps, setWaitingForGps] = useState(false);

  useEffect(() => {
    if (!runnerEmail) {
      setRunner(null);
      setFreshnessLabel(null);
      setWaitingForGps(false);
      return;
    }

    const hasAssignedRunner =
      job.status !== "pending" && job.status !== "cancelled" && job.status !== "declined";

    if (!hasAssignedRunner) {
      setRunner(null);
      setFreshnessLabel(null);
      setWaitingForGps(false);
      return;
    }

    setWaitingForGps(true);

    return subscribeRunnerLocation(runnerEmail, (loc) => {
      if (!loc) {
        setRunner(null);
        setFreshnessLabel(null);
        setWaitingForGps(true);
        return;
      }

      setRunner(
        runnerLocationToMapRunner(loc, {
          name: job.runnerName ?? "Your runner",
          vehicle: job.serviceType,
        }),
      );
      setFreshnessLabel(
        isLocationFresh(loc.updatedAt) ? formatLocationFreshness(loc.updatedAt) : "Location signal stale",
      );
      setWaitingForGps(!isLocationFresh(loc.updatedAt));
    });
  }, [runnerEmail, job?.runnerName, job?.serviceType, job?.status]);

  return { runner, freshnessLabel, waitingForGps };
}
