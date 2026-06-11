import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CustomerBrandMark } from "@/components/customer-header-logo";
import { jobStatusLabel } from "@/lib/jobs-service";
import { useCustomerMarketplaceJob } from "@/lib/use-marketplace-job";
import { useCustomerApp } from "@/lib/customer-store";

export const Route = createFileRoute("/customer/live-job-tracking")({
  component: CustomerLiveJobTrackingPage,
});

function CustomerLiveJobTrackingPage() {
  const navigate = useNavigate();
  const activeJobId = useCustomerApp((s) => s.activeJobId);
  const { job } = useCustomerMarketplaceJob(activeJobId);

  useEffect(() => {
    if (!activeJobId) {
      navigate({ to: "/customer/home", replace: true });
    }
  }, [activeJobId, navigate]);

  useEffect(() => {
    if (!job) return;
    if (job.status === "completed") {
      navigate({ to: "/customer/rate-runner", replace: true });
      return;
    }
    if (job.status === "cancelled") {
      navigate({ to: "/customer/home", replace: true });
      return;
    }
    if (job.status !== "pending") {
      const id = window.setTimeout(() => navigate({ to: "/customer/tracking-runner", replace: true }), 1200);
      return () => clearTimeout(id);
    }
    navigate({ to: "/customer/matching-runner", replace: true });
  }, [job, navigate]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-primary px-6 text-center text-primary-foreground">
      <CustomerBrandMark className="mb-6 brightness-0 invert" />
      <h1 className="text-2xl font-bold">Live job tracking</h1>
      <p className="mt-2 text-sm text-primary-foreground/80">
        {job ? jobStatusLabel(job.status) : "Syncing your request…"}
      </p>
      {job?.runnerName ? (
        <p className="mt-3 text-sm font-semibold">Runner: {job.runnerName}</p>
      ) : null}
    </div>
  );
}
