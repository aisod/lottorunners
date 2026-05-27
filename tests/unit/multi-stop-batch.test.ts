import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: () => false,
  isLocalDevAuthAllowed: () => false,
  getDataSyncMode: () => "local-only" as const,
}));

import { advanceRunnerJobStatus, getJob } from "@/lib/jobs-service";
import type { MarketplaceJob } from "@/lib/jobs-types";

const JOBS_KEY = "lr-marketplace-jobs-v1";

function writeJobs(jobs: MarketplaceJob[]): void {
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
}

describe("multi-stop business batch (local-only)", () => {
  beforeEach(() => {
    const job: MarketplaceJob = {
      id: "batch-job-1",
      source: "business",
      businessId: "biz@test.com",
      businessEmail: "biz@test.com",
      businessName: "Biz",
      batchId: "batch-1",
      batchName: "Test batch",
      batchStops: [
        { address: "Stop A", coord: { lat: 1, lng: 1 } },
        { address: "Stop B", coord: { lat: 2, lng: 2 } },
      ],
      currentStopIndex: 0,
      customerId: "biz@test.com",
      customerEmail: "biz@test.com",
      customerName: "Biz",
      serviceType: "delivery",
      pickupAddress: "Pickup",
      pickup: { lat: 0, lng: 0 },
      dropoffAddress: "Stop A",
      dropoff: { lat: 1, lng: 1 },
      estimatedFare: 100,
      distanceKm: 5,
      etaMin: 20,
      paymentMethod: "cash",
      status: "in_progress",
      scheduleMode: "now",
      createdAt: Date.now(),
      runnerId: "runner@test.com",
      runnerEmail: "runner@test.com",
      runnerName: "Runner",
    };
    writeJobs([job]);
  });

  it("completes an intermediate stop without finishing the job", async () => {
    const updated = await advanceRunnerJobStatus("batch-job-1", "runner@test.com");
    expect(updated).not.toBeNull();
    expect(updated?.status).toBe("en_route");
    expect(updated?.currentStopIndex).toBe(1);
    expect(updated?.dropoffAddress).toBe("Stop B");
    expect(updated?.batchStops?.[0]?.completedAt).toBeTypeOf("number");
    expect(updated?.status).not.toBe("completed");
  });

  it("completes the job on the last stop", async () => {
    const mid = getJob("batch-job-1");
    if (!mid?.batchStops) throw new Error("fixture missing batchStops");
    writeJobs([
      {
        ...mid,
        status: "in_progress",
        currentStopIndex: 1,
        dropoff: mid.batchStops[1].coord,
        dropoffAddress: mid.batchStops[1].address,
        batchStops: [
          { ...mid.batchStops[0], completedAt: Date.now() },
          mid.batchStops[1],
        ],
      },
    ]);

    const updated = await advanceRunnerJobStatus("batch-job-1", "runner@test.com");
    expect(updated?.status).toBe("completed");
    expect(updated?.completedAt).toBeTypeOf("number");
  });
});
