import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cancelJob, getCurrentCustomerId, jobStatusLabel } from "@/lib/jobs-service";
import { useCustomerMarketplaceJob } from "@/lib/use-marketplace-job";
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
@keyframes lr-radar-pulse {
  0% { transform: scale(0.85); opacity: 0.5; }
  100% { transform: scale(1.35); opacity: 0; }
}
@keyframes lr-road-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes lr-runner-drive {
  0% { transform: translateX(-30vw) translateY(0); }
  25% { transform: translateX(25vw) translateY(-4px); }
  50% { transform: translateX(55vw) translateY(0); }
  75% { transform: translateX(85vw) translateY(-3px); }
  100% { transform: translateX(calc(100vw + 30vw)) translateY(0); }
}
@keyframes lr-wheel-spin {
  to { transform: rotate(360deg); }
}
@keyframes lr-speed-line {
  0% { opacity: 0; transform: translateX(0) scaleX(0.3); }
  30% { opacity: 0.6; }
  100% { opacity: 0; transform: translateX(-40px) scaleX(1); }
}
@keyframes lr-dot-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
  40% { transform: translateY(-8px); opacity: 1; }
}
@keyframes lr-progress-fill {
  0% { width: 12%; }
  50% { width: 72%; }
  100% { width: 88%; }
}
@keyframes lr-progress-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
@keyframes lr-car-wiggle {
  0%, 100% { transform: rotate(0deg) scale(1); }
  20% { transform: rotate(-4deg) scale(1.05); }
  40% { transform: rotate(4deg) scale(1.05); }
  60% { transform: rotate(-2deg) scale(1.02); }
}
@keyframes lr-toast-in {
  0% { opacity: 0; transform: translateY(8px) scale(0.95); }
  15% { opacity: 1; transform: translateY(0) scale(1); }
  85% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-4px); }
}
@media (prefers-reduced-motion: reduce) {
  .lr-animate-drive,
  .lr-animate-road,
  .lr-animate-radar,
  .lr-animate-wheel,
  .lr-animate-speed,
  .lr-animate-progress,
  .lr-animate-shimmer,
  .lr-animate-dot {
    animation: none !important;
  }
}
`;

function DeliveryRunnerIcon({ wiggle }: { wiggle: boolean }) {
  return (
    <svg
      width="180"
      height="100"
      viewBox="0 0 180 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="text-primary"
      style={wiggle ? { animation: "lr-car-wiggle 0.5s ease-in-out" } : undefined}
    >
      <ellipse cx="18" cy="58" rx="12" ry="6" fill="currentColor" opacity="0.12" />
      <path
        d="M42 62 H95 Q102 62 105 55 L112 42 Q115 36 122 36 H138 Q148 36 152 44 L158 58 Q160 64 154 68 H48 Q40 68 38 62 Z"
        fill="currentColor"
      />
      <ellipse cx="72" cy="48" rx="18" ry="8" fill="currentColor" opacity="0.9" />
      <path
        d="M118 36 L128 22 M128 22 H145 M128 22 L118 28"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="52" y="28" width="36" height="32" rx="6" fill="#005d98" />
      <rect x="56" y="32" width="28" height="20" rx="3" fill="white" opacity="0.25" />
      <text
        x="70"
        y="48"
        textAnchor="middle"
        fill="white"
        fontSize="11"
        fontWeight="bold"
        fontFamily="system-ui,sans-serif"
      >
        LR
      </text>
      <rect x="96" y="38" width="22" height="18" rx="3" fill="#005d98" opacity="0.85" />
      <circle cx="156" cy="54" r="5" fill="#fde68a" />
      <circle cx="156" cy="54" r="8" fill="#fde68a" opacity="0.35" />
      <g
        className="lr-animate-wheel"
        style={{ transformOrigin: "52px 72px", animation: "lr-wheel-spin 0.5s linear infinite" }}
      >
        <circle cx="52" cy="72" r="14" fill="#1e293b" />
        <circle cx="52" cy="72" r="6" fill="#94a3b8" />
      </g>
      <g
        className="lr-animate-wheel"
        style={{ transformOrigin: "138px 72px", animation: "lr-wheel-spin 0.5s linear infinite" }}
      >
        <circle cx="138" cy="72" r="14" fill="#1e293b" />
        <circle cx="138" cy="72" r="6" fill="#94a3b8" />
      </g>
      <circle cx="88" cy="32" r="10" fill="currentColor" opacity="0.9" />
      <path d="M82 42 Q88 38 94 42 L92 52 H84 Z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

function RadarRing({ size, delay }: { size: string; delay: number }) {
  return (
    <div
      className="lr-animate-radar pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-primary/25"
      style={{
        width: size,
        height: size,
        animation: "lr-radar-pulse 2.4s ease-out infinite",
        animationDelay: `${delay}s`,
      }}
    />
  );
}

function SpeedLine({ top, delay }: { top: string; delay: number }) {
  return (
    <div
      className="lr-animate-speed pointer-events-none absolute h-1 w-16 rounded-full bg-primary/20"
      style={{
        top,
        left: "20%",
        animation: "lr-speed-line 1s ease-out infinite",
        animationDelay: `${delay}s`,
      }}
    />
  );
}

function LoadingDot({ delay }: { delay: number }) {
  return (
    <span
      className="lr-animate-dot inline-block h-2.5 w-2.5 rounded-full bg-primary"
      style={{
        animation: "lr-dot-bounce 1.2s ease-in-out infinite",
        animationDelay: `${delay}s`,
      }}
    />
  );
}

function CustomerMatchingRunnerPage() {
  const navigate = useNavigate();
  const activeJobId = useCustomerApp((s) => s.activeJobId);
  const setActiveJobId = useCustomerApp((s) => s.setActiveJobId);
  const reset = useCustomerApp((s) => s.reset);
  const job = useCustomerMarketplaceJob(activeJobId);
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
    void (async () => {
      if (activeJobId && customerId) {
        await cancelJob(activeJobId, customerId);
      }
      setActiveJobId(null);
      reset();
      navigate({ to: "/customer/home" });
    })();
  };

  const handleRunnerTap = useCallback(() => {
    setWiggle(true);
    setHonkVisible(true);
    window.setTimeout(() => setWiggle(false), 500);
    window.setTimeout(() => setHonkVisible(false), 1800);
  }, []);

  const liveStatus = job ? jobStatusLabel(job.status) : "Waiting for runner";

  return (
    <div className="flex min-h-dvh flex-col overflow-hidden bg-background">
      <style dangerouslySetInnerHTML={{ __html: ANIMATION_CSS }} />

      <div className="relative h-[60dvh] min-h-[280px] w-full shrink-0 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              linear-gradient(180deg,
                oklch(0.48 0.14 248 / 0.12) 0%,
                oklch(0.48 0.14 248 / 0.04) 45%,
                var(--background) 100%
              )`,
          }}
        />

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <RadarRing size="min(92vw, 380px)" delay={0} />
        <RadarRing size="min(72vw, 300px)" delay={0.6} />
        <RadarRing size="min(52vw, 220px)" delay={1.2} />

        <SpeedLine top="38%" delay={0} />
        <SpeedLine top="48%" delay={0.35} />
        <SpeedLine top="58%" delay={0.7} />

        {honkVisible ? (
          <div
            className="pointer-events-none absolute left-1/2 top-[28%] z-20 -translate-x-1/2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg"
            style={{ animation: "lr-toast-in 1.8s ease-out forwards" }}
          >
            Beep! Your runner is on the way
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 h-[28%] min-h-[88px] bg-slate-800">
          <div className="absolute inset-x-0 top-0 h-1 bg-slate-600" />
          <div className="absolute inset-x-0 bottom-0 top-3 overflow-hidden">
            <div
              className="lr-animate-road absolute inset-y-0 left-0 flex w-[200%] items-center gap-10 px-4"
              style={{ animation: "lr-road-scroll 0.9s linear infinite" }}
            >
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="h-1.5 w-14 shrink-0 rounded-full bg-amber-300/70" />
              ))}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-2 bg-slate-900/50" />
        </div>

        <button
          type="button"
          onClick={handleRunnerTap}
          className="lr-animate-drive absolute bottom-[12%] left-0 z-10 flex items-end text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          style={{ animation: "lr-runner-drive 3.2s ease-in-out infinite" }}
          aria-label="Runner en route — tap for a beep"
        >
          <DeliveryRunnerIcon wiggle={wiggle} />
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-between px-6 pb-8 pt-5">
        <div className="text-center">
          <h1 className="text-2xl font-black tracking-tight text-foreground">Finding your runner</h1>
          <p className="mt-1 text-sm font-medium text-primary">{liveStatus}</p>
          <p
            key={statusIndex}
            className="mt-3 min-h-[2.5rem] text-sm font-medium text-muted-foreground transition-opacity duration-300"
          >
            {STATUS_LINES[statusIndex]}
          </p>
          {job ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Request #{job.id.slice(-8)} · N$ {job.estimatedFare.toFixed(2)}
            </p>
          ) : null}
          <div className="mt-5 flex items-center justify-center gap-2">
            <LoadingDot delay={0} />
            <LoadingDot delay={0.2} />
            <LoadingDot delay={0.4} />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Searching</span>
              <span className="text-primary">Active</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="lr-animate-progress absolute inset-y-0 left-0 rounded-full bg-primary"
                style={{ animation: "lr-progress-fill 8s ease-in-out infinite alternate" }}
              />
              <div
                className="lr-animate-shimmer pointer-events-none absolute inset-y-0 w-1/3 rounded-full bg-white/30"
                style={{ animation: "lr-progress-shimmer 1.2s ease-in-out infinite" }}
              />
            </div>
          </div>

          <Button variant="outline" className="h-11 w-full" onClick={handleCancelRequest}>
            Cancel Request
          </Button>
        </div>
      </div>
    </div>
  );
}
