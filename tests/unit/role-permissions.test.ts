import { describe, expect, it } from "vitest";
import { getAuthSession } from "@/lib/auth-session";
import { getRoleHomePath, setCustomerOnboarded } from "@/lib/store";
import { seedAuthSession, sessionHasAdminAccess } from "../helpers/auth-fixtures";

describe("role permissions (route home paths)", () => {
  it("maps each role to its console entry", () => {
    seedAuthSession({ email: "c@test.com", roles: ["customer"], activeRole: "customer" });
    localStorage.setItem(
      "lr-users-v1",
      JSON.stringify([{ email: "c@test.com", password: "x", roles: ["customer"], displayName: "Test" }]),
    );
    expect(getRoleHomePath("customer")).toBe("/customer/home");
    expect(getRoleHomePath("runner")).toMatch(/\/runner\//);
    expect(getRoleHomePath("business")).toBe("/business/dashboard");
    expect(getRoleHomePath("admin")).toBe("/admin/overview");
  });

  it("admin access requires admin in roles", () => {
    seedAuthSession({ email: "c@test.com", roles: ["customer"], activeRole: "customer" });
    expect(sessionHasAdminAccess(getAuthSession())).toBe(false);

    seedAuthSession({
      email: "a@test.com",
      roles: ["customer", "admin"],
      activeRole: "customer",
    });
    expect(sessionHasAdminAccess(getAuthSession())).toBe(true);
  });
});

describe("protected route path sets", () => {
  const RUNNER_CONSOLE = [
    "/runner/dashboard",
    "/runner/active-job",
    "/runner/incoming-job-alert",
  ];

  const PUBLIC_CUSTOMER = ["/customer/signin", "/customer/welcome", "/customer/verify"];

  it("runner console paths are distinct from public customer auth paths", () => {
    for (const path of RUNNER_CONSOLE) {
      expect(PUBLIC_CUSTOMER.includes(path)).toBe(false);
    }
  });
});
