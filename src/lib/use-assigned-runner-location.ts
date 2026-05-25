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
    if (!runnerEmail || !job) {
      setRunner(null);
      setFreshnessLabel(null);
      setWaitingForGps(false);
      return;
    }

    const activeJob = job;
    const hasAssignedRunner =
      activeJob.status !== "pending" && activeJob.status !== "cancelled" && activeJob.status !== "declined";

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
          name: activeJob.runnerName ?? "Your runner",
          vehicle: activeJob.serviceType,
        }),
      );
      setFreshnessLabel(
        isLocationFresh(loc.updatedAt) ? formatLocationFreshness(loc.updatedAt) : "Location signal stale",
      );
      setWaitingForGps(!isLocationFresh(loc.updatedAt));
    });
  }, [runnerEmail, job, job?.runnerName, job?.serviceType, job?.status]);

  return { runner, freshnessLabel, waitingForGps };
}
