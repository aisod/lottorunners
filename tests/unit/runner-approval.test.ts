import { describe, expect, it } from "vitest";
import { canRunnerAcceptJobs, getRunnerOnboardingStatus } from "@/lib/runner-account";
import { seedApprovedRunner } from "../helpers/auth-fixtures";

describe("runner approval (admin gate in app)", () => {
  it("blocks accept until runner is approved", () => {
    localStorage.setItem(
      "lr-users-v1",
      JSON.stringify([
        {
          email: "pending@test.com",
          password: "x",
          roles: ["runner"],
          runnerStatus: "pending_verification",
        },
      ]),
    );
    expect(canRunnerAcceptJobs("pending@test.com")).toBe(false);
    expect(getRunnerOnboardingStatus("pending@test.com")).toBe("pending_verification");
  });

  it("allows accept when runner is approved", () => {
    seedApprovedRunner("approved@test.com");
    expect(canRunnerAcceptJobs("approved@test.com")).toBe(true);
    expect(getRunnerOnboardingStatus("approved@test.com")).toBe("approved");
  });
});
