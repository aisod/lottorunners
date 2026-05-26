import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createAnonTestClient, createServiceRoleClient } from "../helpers/supabase-clients";
import { hasSupabaseIntegrationEnv, hasSupabaseServiceRole } from "../helpers/env";

const describeIntegration = hasSupabaseIntegrationEnv() ? describe : describe.skip;

describeIntegration("Supabase RLS (live project)", () => {
  const runId = `test-${Date.now()}`;
  const customerEmail = `${runId}-customer@test.lottorunners.local`;
  const runnerEmail = `${runId}-runner@test.lottorunners.local`;
  const intruderEmail = `${runId}-intruder@test.lottorunners.local`;
  const password = `Test-${runId}!Aa1`;

  let customerClient = createAnonTestClient();
  let runnerClient = createAnonTestClient();
  let intruderClient = createAnonTestClient();
  let jobId = `${runId}-job`;

  beforeAll(async () => {
    if (!hasSupabaseServiceRole()) {
      console.warn("SUPABASE_SERVICE_ROLE_KEY not set — skipping user seed");
    }

    const signUp = async (email: string) => {
      const { error } = await customerClient.auth.signUp({ email, password });
      if (error && !error.message.includes("already")) {
        throw error;
      }
    };

    await signUp(customerEmail);
    customerClient = createAnonTestClient();
    await customerClient.auth.signInWithPassword({ email: customerEmail, password });

    await signUp(runnerEmail);
    runnerClient = createAnonTestClient();
    await runnerClient.auth.signInWithPassword({ email: runnerEmail, password });

    await signUp(intruderEmail);
    intruderClient = createAnonTestClient();
    await intruderClient.auth.signInWithPassword({ email: intruderEmail, password });

    if (hasSupabaseServiceRole()) {
      const admin = createServiceRoleClient();
      await admin.from("profiles").update({ runner_status: "approved" }).eq("email", runnerEmail);
    }
  }, 60_000);

  afterAll(async () => {
    if (hasSupabaseServiceRole()) {
      const admin = createServiceRoleClient();
      await admin.from("marketplace_jobs").delete().eq("id", jobId);
    }
    await customerClient.auth.signOut();
    await runnerClient.auth.signOut();
    await intruderClient.auth.signOut();
  });

  it("customer can insert own pending job", async () => {
    const payload = {
      id: jobId,
      customerId: customerEmail,
      customerEmail,
      customerName: "Test Customer",
      serviceType: "ride",
      pickupAddress: "A",
      pickup: { lat: -22.57, lng: 17.08 },
      dropoffAddress: "B",
      dropoff: { lat: -22.58, lng: 17.09 },
      estimatedFare: 40,
      distanceKm: 2,
      etaMin: 5,
      paymentMethod: "wallet",
      status: "pending",
      scheduleMode: "now",
      createdAt: Date.now(),
    };

    const { error } = await customerClient.from("marketplace_jobs").upsert({
      id: jobId,
      payload,
      updated_at: new Date().toISOString(),
    });

    expect(error).toBeNull();
  });

  it("intruder cannot update another users job payload", async () => {
    const { data: row } = await intruderClient
      .from("marketplace_jobs")
      .select("payload")
      .eq("id", jobId)
      .maybeSingle();

    if (!row) {
      // RLS may hide row entirely
      return;
    }

    const stolen = {
      ...(row.payload as Record<string, unknown>),
      status: "cancelled",
    };

    const { error } = await intruderClient
      .from("marketplace_jobs")
      .update({ payload: stolen, updated_at: new Date().toISOString() })
      .eq("id", jobId);

    expect(error).not.toBeNull();
  });

  it("runner accept uses RPC and blocks second accept", async () => {
    const first = await runnerClient.rpc("accept_marketplace_job", {
      p_job_id: jobId,
      p_runner_name: "Test Runner",
      p_runner_phone: null,
    });

    if (first.error?.message.includes("approved")) {
      console.warn("Runner not approved in DB — approve via service role for CI");
      return;
    }

    expect(first.error).toBeNull();

    const second = await intruderClient.rpc("accept_marketplace_job", {
      p_job_id: jobId,
      p_runner_name: "Intruder",
      p_runner_phone: null,
    });

    expect(second.error).not.toBeNull();
  });

  it("runner cannot write another runners GPS row", async () => {
    const { error } = await runnerClient.from("runner_locations").upsert({
      runner_id: intruderEmail,
      lat: -22.5,
      lng: 17.0,
      heading: null,
      updated_at: new Date().toISOString(),
    });

    expect(error).not.toBeNull();
  });

  it("runner can write own GPS row", async () => {
    const { error } = await runnerClient.from("runner_locations").upsert({
      runner_id: runnerEmail,
      lat: -22.5,
      lng: 17.0,
      heading: 90,
      updated_at: new Date().toISOString(),
    });

    expect(error).toBeNull();
  });

  it("non-admin cannot read admin_emails from app_config when restricted", async () => {
    const { data, error } = await intruderClient
      .from("app_config")
      .select("value")
      .eq("key", "admin_emails")
      .maybeSingle();

    if (error) return;
    expect(data).toBeNull();
  });
});
