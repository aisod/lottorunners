import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cancelJob, getCurrentCustomerId, jobStatusLabel } from "@/lib/jobs-service";
import { useMarketplaceJob } from "@/lib/use-marketplace-job";
import { useCustomerApp } from "@/lib/customer-store";

export const Route = createFileRoute("/customer/matching-runner")({
  component: CustomerMatchingRunnerPage,
});

const STATUS_LINES = [
  "Scanning Windhoek for nearby runners…",
  "Checking who's closest to your pickup…",
  "Your request is live for approved runners…",
  "Waiting for a runner to accept…",
  "Hang tight — matching in progress",
];

const ANIMATION_CSS = `
@keyframes lr-radar-pulse { 0% { transform: scale(0.85); opacity: 0.5; } 100% { transform: scale(1.35); opacity: 0; } }
@keyframes lr-road-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
@keyframes lr-runner-drive { 0% { transform: translateX(-30vw); } 100% { transform: translateX(calc(100vw + 30vw)); } }
@keyframes lr-wheel-spin { to { transform: rotate(360deg); } }
@keyframes lr-speed-line { 0% { opacity: 0; } 30% { opacity: 0.6; } 100% { opacity: 0; transform: translateX(-40px); } }
@keyframes lr-dot-bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.35; } 40% { transform: translateY(-8px); opacity: 1; } }
@keyframes lr-car-wiggle { 0%, 100% { transform: rotate(0deg); } 40% { transform: rotate(4deg); } }
@keyframes lr-toast-in { 0% { opacity: 0; } 15% { opacity: 1; } 100% { opacity: 0; } }
`;

function DeliveryRunnerIcon({ wiggle }: { wiggle: boolean }) {
  return (
    <svg width="180" height="100" viewBox="0 0 180 100" fill="none" aria-hidden="true" className="text-primary" style={wiggle ? { animation: "lr-car-wiggle 0.5s ease-in-out" } : undefined}>
      <path d="M42 62 H138 L158 58 H48 Z" fill="currentColor" />
      <rect x="52" y="28" width="36" height="32" rx="6" fill="#2563EB" />
      <circle cx="52" cy="72" r="14" fill="#1e293b" />
      <circle cx="138" cy="72" r="14" fill="#1e293b" />
    </svg>
  );
}

function CustomerMatchingRunnerPage() {
  const navigate = useNavigate();
  const activeJobId = useCustomerApp((s) => s.activeJobId);
  const setActiveJobId = useCustomerApp((s) => s.setActiveJobId);
  const reset = useCustomerApp((s) => s.reset);
  const job = useMarketplaceJob(activeJobId);
  const [statusIndex, setStatusIndex] = useState(0);
  const [honkVisible, setHonkVisible] = useState(false);
  const [wiggle, setWiggle] = useState(false);

  useEffect(() => {
    if (!activeJobId) {
      navigate({ to: "/customer/home", replace: true });
    }
  }, [activeJobId, navigate]);

  useEffect(() => {
    if (!job) return;
    if (job.status === "cancelled") {
      setActiveJobId(null);
      reset();
      navigate({ to: "/customer/home", replace: true });
      return;
    }
    if (job.status !== "pending") {
      navigate({ to: "/customer/live-job-tracking", replace: true });
    }
  }, [job, navigate, reset, setActiveJobId]);

  useEffect(() => {
    const id = setInterval(() => setStatusIndex((i) => (i + 1) % STATUS_LINES.length), 1500);
    return () => clearInterval(id);
  }, []);

  const handleCancelRequest = () => {
    const customerId = getCurrentCustomerId();
    if (activeJobId && customerId) {
      cancelJob(activeJobId, customerId);
    }
    setActiveJobId(null);
    reset();
    navigate({ to: "/customer/home" });
  };

  const handleRunnerTap = useCallback(() => {
    setWiggle(true);
    setHonkVisible(true);
    window.setTimeout(() => setWiggle(false), 500);
    window.setTimeout(() => setHonkVisible(false), 1800);
  }, []);

  const liveStatus = job ? jobStatusLabel(job.status) : "Waiting for runner";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col bg-background px-6 pb-8 pt-10">
      <style dangerouslySetInnerHTML={{ __html: ANIMATION_CSS }} />
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <button
          type="button"
          onClick={handleRunnerTap}
          className="mb-8"
          aria-label="Matching animation"
        >
          <DeliveryRunnerIcon wiggle={wiggle} />
        </button>
        {honkVisible ? (
          <p className="mb-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Beep! Your runner is on the way
          </p>
        ) : null}
        <h1 className="text-2xl font-black tracking-tight">Finding your runner</h1>
        <p className="mt-2 text-sm font-medium text-primary">{liveStatus}</p>
        <p className="mt-3 min-h-[2.5rem] text-sm text-muted-foreground">{STATUS_LINES[statusIndex]}</p>
        {job ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Request #{job.id.slice(-8)} · N$ {job.estimatedFare.toFixed(2)}
          </p>
        ) : null}
      </div>
      <Button variant="outline" className="mt-8 h-11 w-full" onClick={handleCancelRequest}>
        Cancel Request
      </Button>
    </div>
  );
}
