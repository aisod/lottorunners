import type { MarketplaceJob } from "./jobs-types";
import { jobStatusLabel, readJobs } from "./jobs-service";
import { getPlatformFeePercent } from "./platform-pricing";
import { getServices } from "./services";

function platformFeeRate(): number {
  return getPlatformFeePercent() / 100;
}

export function formatNad(amount: number, compact = false): string {
  if (compact && amount >= 1000) {
    return `N$ ${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`;
  }
  return `N$ ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function platformFee(gross: number): number {
  return Math.round(gross * platformFeeRate() * 100) / 100;
}

export function runnerNet(gross: number): number {
  return Math.round(gross * (1 - platformFeeRate()) * 100) / 100;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfMonth(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export type AdminPlatformStats = {
  activeJobs: number;
  pendingJobs: number;
  inProgressJobs: number;
  revenueToday: number;
  pendingVerifications: number;
  uniqueRunnersActive: number;
  completionRatePct: number;
  avgRating: number | null;
  gmvMonth: number;
  uniqueCustomersMonth: number;
};

export function computeAdminPlatformStats(
  jobs: MarketplaceJob[],
  pendingRunnerCount: number,
): AdminPlatformStats {
  const now = Date.now();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);

  const active = jobs.filter(
    (j) => j.status !== "completed" && j.status !== "cancelled" && j.status !== "declined",
  );
  const completedMonth = jobs.filter(
    (j) => j.status === "completed" && (j.completedAt ?? j.createdAt) >= monthStart,
  );
  const completedAll = jobs.filter((j) => j.status === "completed");
  const terminal = jobs.filter((j) =>
    ["completed", "cancelled", "declined"].includes(j.status),
  );

  const revenueToday = jobs
    .filter((j) => j.status === "completed" && (j.completedAt ?? j.createdAt) >= todayStart)
    .reduce((s, j) => s + j.estimatedFare, 0);

  const ratings = completedAll
    .map((j) => j.rating ?? j.runnerRating)
    .filter((r): r is number => typeof r === "number" && r > 0);

  const runners = new Set(
    active.map((j) => j.runnerEmail ?? j.runnerId).filter(Boolean) as string[],
  );

  return {
    activeJobs: active.length,
    pendingJobs: jobs.filter((j) => j.status === "pending").length,
    inProgressJobs: jobs.filter((j) =>
      ["accepted", "en_route", "arrived", "in_progress"].includes(j.status),
    ).length,
    revenueToday: Math.round(revenueToday * 100) / 100,
    pendingVerifications: pendingRunnerCount,
    uniqueRunnersActive: runners.size,
    completionRatePct:
      terminal.length > 0
        ? Math.round((completedAll.length / terminal.length) * 1000) / 10
        : 0,
    avgRating:
      ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100
        : null,
    gmvMonth: Math.round(completedMonth.reduce((s, j) => s + j.estimatedFare, 0) * 100) / 100,
    uniqueCustomersMonth: new Set(
      jobs
        .filter((j) => j.createdAt >= monthStart)
        .map((j) => j.customerEmail ?? j.customerId),
    ).size,
  };
}

export type AdminActivityRow = {
  id: string;
  event: string;
  actor: string;
  time: string;
  tone: "success" | "danger" | "warning" | "primary" | "neutral";
  statusLabel: string;
};

export function buildAdminActivityFeed(jobs: MarketplaceJob[], limit = 12): AdminActivityRow[] {
  const sorted = [...jobs].sort(
    (a, b) => (b.completedAt ?? b.acceptedAt ?? b.createdAt) - (a.completedAt ?? a.acceptedAt ?? a.createdAt),
  );

  return sorted.slice(0, limit).map((job) => {
    const shortId = job.id.slice(-8);
    const actor =
      job.runnerName ??
      job.runnerEmail?.split("@")[0] ??
      job.customerName ??
      job.customerEmail.split("@")[0];
    const ts = job.completedAt ?? job.acceptedAt ?? job.createdAt;

    if (job.status === "completed") {
      return {
        id: job.id,
        event: `Job completed · ${shortId}`,
        actor: actor ? `${actor} (Runner)` : "Runner",
        time: relativeTime(ts),
        tone: "success",
        statusLabel: "Completed",
      };
    }
    if (job.status === "cancelled" || job.status === "declined") {
      const closedLabel = job.status === "cancelled" ? "Cancelled" : "Declined";
      return {
        id: job.id,
        event: `Job ${closedLabel.toLowerCase()} · ${shortId}`,
        actor: job.customerName ?? job.customerEmail,
        time: relativeTime(ts),
        tone: "danger",
        statusLabel: closedLabel,
      };
    }
    if (job.status === "pending") {
      const serviceLabel = getServices()[job.serviceType]?.label ?? job.serviceType;
      return {
        id: job.id,
        event: `New job · ${serviceLabel} · ${shortId}`,
        actor: job.customerName ?? job.customerEmail,
        time: relativeTime(job.createdAt),
        tone: "primary",
        statusLabel: "Pending",
      };
    }
    return {
      id: job.id,
      event: `Job in progress · ${shortId}`,
      actor: actor ? `${actor}` : "Assigned",
      time: relativeTime(ts),
      tone: "warning",
      statusLabel: jobStatusLabel(job.status),
    };
  });
}

export type TopRunnerRow = {
  id: string;
  initials: string;
  name: string;
  meta: string;
  jobCount: number;
  avgRating: number | null;
};

export function buildTopRunners(jobs: MarketplaceJob[], limit = 5): TopRunnerRow[] {
  const byRunner = new Map<
    string,
    { name: string; completed: number; ratings: number[] }
  >();

  for (const job of jobs) {
    if (job.status !== "completed") continue;
    const key = job.runnerEmail ?? job.runnerId;
    if (!key) continue;
    const entry = byRunner.get(key) ?? {
      name: job.runnerName ?? key.split("@")[0],
      completed: 0,
      ratings: [],
    };
    entry.completed += 1;
    const r = job.rating ?? job.runnerRating;
    if (typeof r === "number" && r > 0) entry.ratings.push(r);
    byRunner.set(key, entry);
  }

  return [...byRunner.entries()]
    .map(([id, v]) => {
      const avg =
        v.ratings.length > 0
          ? Math.round((v.ratings.reduce((a, b) => a + b, 0) / v.ratings.length) * 10) / 10
          : null;
      const parts = [avg != null ? `${avg}` : "—", `${v.completed} jobs`];
      const initials = v.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
      return {
        id,
        initials: initials || id.slice(0, 2).toUpperCase(),
        name: v.name,
        meta: parts.join(" · "),
        jobCount: v.completed,
        avgRating: avg,
      };
    })
    .sort((a, b) => b.jobCount - a.jobCount)
    .slice(0, limit);
}

export type WeeklyBucket = { label: string; jobs: number; gmv: number };

export function buildWeeklyCompletedBuckets(jobs: MarketplaceJob[], weeks = 5): WeeklyBucket[] {
  const now = Date.now();
  const buckets: WeeklyBucket[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const end = now - i * 7 * 86_400_000;
    const start = end - 7 * 86_400_000;
    const inWeek = jobs.filter(
      (j) =>
        j.status === "completed" &&
        (j.completedAt ?? j.createdAt) >= start &&
        (j.completedAt ?? j.createdAt) < end,
    );
    buckets.push({
      label: `W${weeks - i}`,
      jobs: inWeek.length,
      gmv: Math.round(inWeek.reduce((s, j) => s + j.estimatedFare, 0) / 1000),
    });
  }

  return buckets;
}

export type MonthlyRevenueBucket = { month: string; value: number };

export function buildMonthlyRevenueBuckets(jobs: MarketplaceJob[], months = 6): MonthlyRevenueBucket[] {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const buckets: MonthlyRevenueBucket[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.getTime();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const gross = jobs
      .filter(
        (j) =>
          j.status === "completed" &&
          (j.completedAt ?? j.createdAt) >= start &&
          (j.completedAt ?? j.createdAt) < end,
      )
      .reduce((s, j) => s + j.estimatedFare, 0);
    buckets.push({
      month: labels[d.getMonth()] ?? "?",
      value: Math.round(gross / 1000),
    });
  }

  return buckets;
}

export type SettlementBatchRow = {
  id: string;
  gross: string;
  net: string;
  runners: number;
  status: string;
};

export function buildSettlementBatches(jobs: MarketplaceJob[], days = 7): SettlementBatchRow[] {
  const batches: SettlementBatchRow[] = [];
  const now = startOfDay(Date.now());

  for (let i = 0; i < days; i++) {
    const dayStart = now - i * 86_400_000;
    const dayEnd = dayStart + 86_400_000;
    const dayJobs = jobs.filter(
      (j) =>
        j.status === "completed" &&
        (j.completedAt ?? j.createdAt) >= dayStart &&
        (j.completedAt ?? j.createdAt) < dayEnd,
    );
    if (dayJobs.length === 0 && i > 2) continue;

    const gross = dayJobs.reduce((s, j) => s + j.estimatedFare, 0);
    const net = dayJobs.reduce((s, j) => s + runnerNet(j.estimatedFare), 0);
    const runners = new Set(
      dayJobs.map((j) => j.runnerEmail ?? j.runnerId).filter(Boolean),
    ).size;
    const date = new Date(dayStart);
    const id = `PAY-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    batches.push({
      id,
      gross: formatNad(gross),
      net: formatNad(net),
      runners,
      status: i === 0 ? "Today" : "Complete",
    });
  }

  return batches.slice(0, 7);
}

export function computeAdminPaymentsStats(jobs: MarketplaceJob[]) {
  const now = Date.now();
  const monthStart = startOfMonth(now);
  const completedMonth = jobs.filter(
    (j) => j.status === "completed" && (j.completedAt ?? j.createdAt) >= monthStart,
  );
  const grossMonth = completedMonth.reduce((s, j) => s + j.estimatedFare, 0);
  const pendingPayout = jobs
    .filter((j) => j.status === "completed" && !j.completedAt)
    .concat(
      jobs.filter(
        (j) =>
          ["accepted", "en_route", "arrived", "in_progress"].includes(j.status) &&
          j.runnerId,
      ),
    )
    .reduce((s, j) => s + runnerNet(j.estimatedFare), 0);

  const activeRunners = new Set(
    jobs
      .filter((j) =>
        ["accepted", "en_route", "arrived", "in_progress", "completed"].includes(j.status),
      )
      .map((j) => j.runnerEmail ?? j.runnerId)
      .filter(Boolean),
  ).size;

  return {
    totalRevenue: formatNad(grossMonth),
    pendingPayouts: formatNad(
      jobs
        .filter((j) => j.status === "completed" && (j.completedAt ?? j.createdAt) >= monthStart)
        .reduce((s, j) => s + runnerNet(j.estimatedFare), 0),
    ),
    activeRunners: String(activeRunners),
    avgCommission: `${getPlatformFeePercent()}%`,
  };
}

export type BusinessSpendStats = {
  monthlySpend: number;
  mtdJobCount: number;
  activeJobs: number;
  policyFlags: number;
  topServiceLabel: string;
  topServicePct: number;
};

export function computeBusinessSpendStats(jobs: MarketplaceJob[]): BusinessSpendStats {
  const now = Date.now();
  const monthStart = startOfMonth(now);
  const thisMonth = jobs.filter((j) => j.createdAt >= monthStart);
  const active = jobs.filter(
    (j) => j.status !== "completed" && j.status !== "cancelled" && j.status !== "declined",
  );

  const byService = new Map<string, number>();
  for (const j of thisMonth) {
    byService.set(j.serviceType, (byService.get(j.serviceType) ?? 0) + j.estimatedFare);
  }
  let topService = "—";
  let topPct = 0;
  const totalSpend = thisMonth.reduce((s, j) => s + j.estimatedFare, 0);
  if (totalSpend > 0 && byService.size > 0) {
    const [svc, amt] = [...byService.entries()].sort((a, b) => b[1] - a[1])[0];
    topService = svc.charAt(0).toUpperCase() + svc.slice(1);
    topPct = Math.round((amt / totalSpend) * 100);
  }

  const policyFlags = jobs.filter(
    (j) => j.estimatedFare >= 2500 && j.status !== "cancelled" && j.status !== "declined",
  ).length;

  return {
    monthlySpend: Math.round(totalSpend * 100) / 100,
    mtdJobCount: thisMonth.length,
    activeJobs: active.length,
    policyFlags,
    topServiceLabel: topService,
    topServicePct: topPct,
  };
}

export function buildBusinessMonthlySpend(jobs: MarketplaceJob[], months = 5): { month: string; spend: number }[] {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const buckets: { month: string; spend: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.getTime();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const spend = jobs
      .filter((j) => j.createdAt >= start && j.createdAt < end)
      .reduce((s, j) => s + j.estimatedFare, 0);
    buckets.push({ month: labels[d.getMonth()] ?? "?", spend: Math.round(spend) });
  }

  return buckets;
}

export type BusinessInvoiceRow = {
  id: string;
  period: string;
  amount: string;
  amountNum: number;
  status: string;
  tone: "success" | "warning";
};

export function buildBusinessInvoices(jobs: MarketplaceJob[]): BusinessInvoiceRow[] {
  const byMonth = new Map<string, { total: number; jobs: number }>();

  for (const job of jobs) {
    const d = new Date(job.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = byMonth.get(key) ?? { total: 0, jobs: 0 };
    entry.total += job.estimatedFare;
    entry.jobs += 1;
    byMonth.set(key, entry);
  }

  const sorted = [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return sorted.slice(0, 12).map(([key, v], index) => {
    const [y, m] = key.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    const period = `${start.toLocaleDateString([], { month: "short", day: "numeric" })} — ${end.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;
    const isCurrent = index === 0;
    return {
      id: `INV-${key.replace("-", "")}`,
      period,
      amount: formatNad(v.total),
      amountNum: v.total,
      status: isCurrent ? "Due (open)" : "Recorded",
      tone: isCurrent ? "warning" : "success",
    };
  });
}

export type BusinessRunnerPartner = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  jobCount: number;
  spend: number;
};

export function buildBusinessRunnerPartners(jobs: MarketplaceJob[]): BusinessRunnerPartner[] {
  const byRunner = new Map<
    string,
    { name: string; jobs: number; spend: number; lastAt: number; active: boolean }
  >();

  for (const job of jobs) {
    const key = job.runnerEmail ?? job.runnerId;
    if (!key) continue;
    const entry = byRunner.get(key) ?? {
      name: job.runnerName ?? key.split("@")[0],
      jobs: 0,
      spend: 0,
      lastAt: 0,
      active: false,
    };
    entry.jobs += 1;
    entry.spend += job.estimatedFare;
    entry.lastAt = Math.max(entry.lastAt, job.completedAt ?? job.createdAt);
    if (
      ["accepted", "en_route", "arrived", "in_progress"].includes(job.status)
    ) {
      entry.active = true;
    }
    byRunner.set(key, entry);
  }

  return [...byRunner.entries()]
    .map(([id, v]) => ({
      id,
      name: v.name,
      email: id,
      role: "Assigned runner",
      status: v.active ? "On active job" : v.jobs > 0 ? "Completed runs" : "—",
      jobCount: v.jobs,
      spend: Math.round(v.spend * 100) / 100,
    }))
    .sort((a, b) => b.jobCount - a.jobCount);
}

export function runnerAvgRatingFromJobs(runnerKey: string, jobs: MarketplaceJob[]): string {
  const ratings = jobs
    .filter(
      (j) =>
        j.status === "completed" &&
        (j.runnerEmail === runnerKey || j.runnerId === runnerKey),
    )
    .map((j) => j.rating ?? j.runnerRating)
    .filter((r): r is number => typeof r === "number" && r > 0);

  if (ratings.length === 0) return "N/A";
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return avg.toFixed(1);
}

/** Snapshot read for non-React callers. */
export function getAllMarketplaceJobsSnapshot(): MarketplaceJob[] {
  return readJobs();
}
