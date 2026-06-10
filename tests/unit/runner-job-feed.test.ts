import { describe, expect, it } from "vitest";
import {
  countPendingHiddenByServiceFilter,
  filterPendingJobsForRunner,
  isJobUnassigned,
  runnerCanSeePendingJob,
  runnerOfferedIdToServiceType,
  runnerOfferedIdsToServiceTypes,
} from "@/lib/jobs-runner-feed";
import type { MarketplaceJob } from "@/lib/jobs-types";
import { ALL_RIDE_CATEGORIES } from "@/lib/ride-categories";

function pendingJob(
  id: string,
  serviceType: MarketplaceJob["serviceType"],
  subType?: string,
): MarketplaceJob {
  return {
    id,
    customerId: "c@test.com",
    customerEmail: "c@test.com",
    customerName: "C",
    serviceType,
    subType,
    pickupAddress: "A",
    pickup: { lat: 0, lng: 0 },
    dropoffAddress: "B",
    dropoff: { lat: 1, lng: 1 },
    estimatedFare: 10,
    distanceKm: 1,
    etaMin: 5,
    paymentMethod: "cash",
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

  it("counts business delivery jobs hidden when runner only offers taxi", () => {
    const businessDelivery: MarketplaceJob = {
      ...pendingJob("biz-1", "delivery"),
      source: "business",
      businessEmail: "biz@test.com",
    };
    const offered = runnerOfferedIdsToServiceTypes(["taxi"]);
    expect(isJobUnassigned(businessDelivery)).toBe(true);
    expect(filterPendingJobsForRunner([businessDelivery], offered, new Set())).toEqual([]);
    expect(countPendingHiddenByServiceFilter([businessDelivery], offered, new Set())).toBe(1);
  });

  it("filters ride jobs by ride category only", () => {
    const offered = runnerOfferedIdsToServiceTypes(["taxi"]);
    const womenRide = pendingJob("ride-women", "ride", "women");
    const delivery = pendingJob("delivery-1", "delivery");
    const errand = pendingJob("errand-1", "errand", "personal_shopper");
    const truck = pendingJob("truck-1", "truck", "large");

    const womenOnlyCategories = ["women"] as const;
    expect(
      filterPendingJobsForRunner(
        [womenRide, delivery, errand, truck],
        offered,
        new Set(),
        [...womenOnlyCategories],
      ).map((j) => j.id),
    ).toEqual(["ride-women"]);

    expect(
      filterPendingJobsForRunner(
        [womenRide, delivery, errand, truck],
        offered,
        new Set(),
        ["standard"],
      ),
    ).toEqual([]);

    const deliveryOnly = runnerOfferedIdsToServiceTypes(["delivery"]);
    expect(
      filterPendingJobsForRunner([delivery, errand, truck], deliveryOnly, new Set(), ["standard"]).map(
        (j) => j.id,
      ),
    ).toEqual(["delivery-1"]);
  });

  it("does not apply ride-category filter to truck, errand, or delivery", () => {
    const offered = runnerOfferedIdsToServiceTypes(["delivery", "errand", "truck"]);
    const jobs = [
      pendingJob("d1", "delivery"),
      pendingJob("e1", "errand", "pharmacy"),
      pendingJob("t1", "truck", "small"),
    ];
    expect(
      runnerCanSeePendingJob(jobs[0], offered, new Set(), ["women"]),
    ).toBe(true);
    expect(
      runnerCanSeePendingJob(jobs[1], offered, new Set(), ["women"]),
    ).toBe(true);
    expect(
      runnerCanSeePendingJob(jobs[2], offered, new Set(), ["women"]),
    ).toBe(true);
  });

  it("shows all ride subtypes when runner has all ride categories", () => {
    const offered = runnerOfferedIdsToServiceTypes(["taxi"]);
    const jobs = [
      pendingJob("r1", "ride", "standard"),
      pendingJob("r2", "ride", "corporate"),
    ];
    expect(
      filterPendingJobsForRunner(jobs, offered, new Set(), ALL_RIDE_CATEGORIES).map((j) => j.id),
    ).toEqual(["r1", "r2"]);
  });
});
