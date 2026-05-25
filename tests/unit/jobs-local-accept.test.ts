import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: () => false,
  isLocalDevAuthAllowed: () => false,
  getDataSyncMode: () => "local-only" as const,
}));
import { acceptJob, listAvailableJobsForRunner } from "@/lib/jobs-service";
import type { MarketplaceJob } from "@/lib/jobs-types";
import { seedApprovedRunner } from "../helpers/auth-fixtures";
import { useRunnerSettings } from "@/lib/runner-settings";

const JOBS_KEY = "lr-marketplace-jobs-v1";

function writeJobs(jobs: MarketplaceJob[]): void {
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
}

describe("runner job acceptance (local-only mode)", () => {
  beforeEach(() => {
    seedApprovedRunner("runner@test.com");
    useRunnerSettings.getState().setSelectedServiceIds(["taxi"]);
    writeJobs([
      {
        id: "job-1",
        customerId: "c@test.com",
        customerEmail: "c@test.com",
        customerName: "C",
        serviceType: "ride",
        pickupAddress: "A",
        pickup: { lat: 0, lng: 0 },
        dropoffAddress: "B",
        dropoff: { lat: 1, lng: 1 },
        estimatedFare: 30,
        distanceKm: 2,
        etaMin: 5,
        paymentMethod: "cash",
        status: "pending",
        scheduleMode: "now",
        createdAt: Date.now(),
      },
    ]);
  });

  it("lists pending ride for taxi-enabled runner", () => {
    const pending = listAvailableJobsForRunner("runner@test.com");
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe("job-1");
  });

  it("accepts job and assigns runner (no Supabase mock)", async () => {
    const result = await acceptJob("job-1", "runner@test.com", "Test Runner");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.job.status).toBe("accepted");
      expect(result.job.runnerId).toBe("runner@test.com");
    }
    expect(listAvailableJobsForRunner("runner@test.com")).toHaveLength(0);
  });
});
