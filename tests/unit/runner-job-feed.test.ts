import { describe, expect, it } from "vitest";
import {
  filterPendingJobsForRunner,
  runnerOfferedIdToServiceType,
  runnerOfferedIdsToServiceTypes,
} from "@/lib/jobs-runner-feed";
import type { MarketplaceJob } from "@/lib/jobs-types";

function pendingJob(id: string, serviceType: MarketplaceJob["serviceType"]): MarketplaceJob {
  return {
    id,
    customerId: "c@test.com",
    customerEmail: "c@test.com",
    customerName: "C",
    serviceType,
    pickupAddress: "A",
    pickup: { lat: 0, lng: 0 },
    dropoffAddress: "B",
    dropoff: { lat: 1, lng: 1 },
    estimatedFare: 10,
    distanceKm: 1,
    etaMin: 5,
    paymentMethod: "wallet",
    status: "pending",
    scheduleMode: "now",
    createdAt: Date.now(),
  };
}

describe("runner job feed filters", () => {
  it("maps taxi offered id to ride service type", () => {
    expect(runnerOfferedIdToServiceType("taxi")).toBe("ride");
  });

  it("returns empty when no services selected", () => {
    const offered = runnerOfferedIdsToServiceTypes([]);
    const jobs = [pendingJob("1", "ride")];
    expect(filterPendingJobsForRunner(jobs, offered, new Set())).toEqual([]);
  });

  it("filters by offered services and declined ids", () => {
    const offered = runnerOfferedIdsToServiceTypes(["taxi", "delivery"]);
    const jobs = [pendingJob("1", "ride"), pendingJob("2", "delivery"), pendingJob("3", "truck")];
    const out = filterPendingJobsForRunner(jobs, offered, new Set(["2"]));
    expect(out.map((j) => j.id)).toEqual(["1"]);
  });
});
