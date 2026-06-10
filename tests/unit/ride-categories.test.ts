import { describe, expect, it } from "vitest";
import {
  jobMatchesRunnerRideCategory,
  normalizeRideCategories,
  profileEligibleForRideJob,
} from "@/lib/ride-categories";

describe("ride categories", () => {
  it("defaults empty profile categories to all ride types", () => {
    expect(normalizeRideCategories(null)).toEqual(["standard", "xl", "women", "corporate"]);
  });

  it("matches ride jobs by subtype only", () => {
    const categories = new Set(["women"] as const);
    expect(
      jobMatchesRunnerRideCategory({ serviceType: "ride", subType: "women" }, categories),
    ).toBe(true);
    expect(
      jobMatchesRunnerRideCategory({ serviceType: "ride", subType: "corporate" }, categories),
    ).toBe(false);
    expect(
      jobMatchesRunnerRideCategory({ serviceType: "delivery", subType: "women" }, categories),
    ).toBe(true);
  });

  it("checks approved runner profile eligibility for ride jobs", () => {
    const profile = {
      roles: ["runner"],
      runner_status: "approved",
      ride_categories: ["corporate"],
    };
    expect(
      profileEligibleForRideJob(profile, { serviceType: "ride", subType: "corporate" }),
    ).toBe(true);
    expect(
      profileEligibleForRideJob(profile, { serviceType: "ride", subType: "women" }),
    ).toBe(false);
    expect(
      profileEligibleForRideJob(profile, { serviceType: "delivery", subType: "corporate" }),
    ).toBe(false);
  });
});
