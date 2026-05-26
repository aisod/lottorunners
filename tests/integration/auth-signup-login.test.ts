import { describe, expect, it, afterAll } from "vitest";
import { createAnonTestClient } from "../helpers/supabase-clients";
import { hasSupabaseIntegrationEnv } from "../helpers/env";
import {
  clearAuthSession,
  createAuthSession,
  getAuthSession,
  persistAuthSession,
} from "@/lib/auth-session";

const describeIntegration = hasSupabaseIntegrationEnv() ? describe : describe.skip;

describeIntegration("signup and login (real Supabase Auth)", () => {
  const runId = `auth-${Date.now()}`;
  const email = `${runId}@test.lottorunners.local`;
  const password = `Test-${runId}!Aa1`;
  const client = createAnonTestClient();

  afterAll(async () => {
    await client.auth.signOut();
    clearAuthSession();
  });

  it("signUp creates auth user", async () => {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { role: "customer" } },
    });
    expect(error).toBeNull();
    expect(data.user?.email).toBe(email);
  });

  it("signInWithPassword returns session with access_token", async () => {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    expect(error).toBeNull();
    expect(data.session?.access_token).toBeTruthy();
  });

  it("app session mirror persists activeRole after login flow", () => {
    persistAuthSession(
      createAuthSession({
        email,
        roles: ["customer"],
        activeRole: "customer",
      }),
    );
    const session = getAuthSession();
    expect(session?.email).toBe(email);
    expect(session?.activeRole).toBe("customer");
  });
});
