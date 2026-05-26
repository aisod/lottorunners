import { describe, expect, it } from "vitest";
import { mergeRemoteJobRows, remoteUpdatedMs } from "@/lib/jobs-merge";
import type { MarketplaceJob } from "@/lib/jobs-types";

function job(id: string, status: MarketplaceJob["status"], createdAt: number, serverUpdatedAt?: number): MarketplaceJob {
  return {
    id,
    customerId: "c@test.com",
    customerEmail: "c@test.com",
    customerName: "C",
    serviceType: "ride",
    pickupAddress: "A",
    pickup: { lat: 0, lng: 0 },
    dropoffAddress: "B",
    dropoff: { lat: 1, lng: 1 },
    estimatedFare: 10,
    distanceKm: 1,
    etaMin: 5,
    paymentMethod: "cash",
    status,
    scheduleMode: "now",
    createdAt,
    serverUpdatedAt,
  };
}

describe("mergeRemoteJobRows", () => {
  it("prefers remote when server updated_at is newer", () => {
    const local = [job("j1", "pending", 1000, 1000)];
    const merged = mergeRemoteJobRows(local, [
      {
        job: { ...local[0], status: "accepted", runnerId: "r@test.com" },
        updatedAt: new Date(5000).toISOString(),
      },
    ]);
    expect(merged[0].status).toBe("accepted");
  });

  it("keeps local when local serverUpdatedAt is ahead of remote", () => {
    const local = [job("j1", "accepted", 1000, 9000)];
    const merged = mergeRemoteJobRows(local, [
      {
        job: { ...local[0], status: "pending" },
        updatedAt: new Date(2000).toISOString(),
      },
    ]);
    expect(merged[0].status).toBe("accepted");
  });

  it("remoteUpdatedMs parses ISO timestamps", () => {
    expect(remoteUpdatedMs("2026-05-20T12:00:00.000Z")).toBeGreaterThan(0);
  });

  it("applies remote accepted over local cancelled when server assigned runner", () => {
    const local = [
      {
        ...job("j1", "cancelled", 5000, 9000),
        runnerId: undefined,
      },
    ];
    const merged = mergeRemoteJobRows(local, [
      {
        job: {
          ...local[0],
          status: "accepted",
          runnerId: "runner@test.com",
          runnerEmail: "runner@test.com",
          runnerName: "R",
        },
        updatedAt: new Date(3000).toISOString(),
      },
    ]);
    expect(merged[0].status).toBe("accepted");
    expect(merged[0].runnerId).toBe("runner@test.com");
  });
});
