import { getCurrentRunnerId, listJobsForRunner } from "./jobs-service";
import type { MarketplaceJob } from "./jobs-types";

const PLATFORM_FEE_RATE = 0.15;

export type RunnerEarningsSummary = {
  today: number;
  week: number;
  month: number;
  tripCount: number;
  avgPerTrip: number;
};

export type RunnerEarningsRow = {
  job: MarketplaceJob;
  gross: number;
  fee: number;
  net: number;
};

function jobNet(job: MarketplaceJob): number {
  return Math.round(job.estimatedFare * (1 - PLATFORM_FEE_RATE) * 100) / 100;
}

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function isSameWeek(ts: number, now: number): boolean {
  const d = new Date(ts);
  const n = new Date(now);
  const day = n.getDay();
  const weekStart = new Date(n);
  weekStart.setDate(n.getDate() - day);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return d >= weekStart && d < weekEnd;
}

function isSameMonth(ts: number, now: number): boolean {
  const d = new Date(ts);
  const n = new Date(now);
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}

export function getRunnerCompletedJobs(runnerId?: string): MarketplaceJob[] {
  const id = runnerId ?? getCurrentRunnerId();
  if (!id) return [];
  return listJobsForRunner(id).filter((job) => job.status === "completed");
}

export function getRunnerEarningsSummary(runnerId?: string): RunnerEarningsSummary {
  const completed = getRunnerCompletedJobs(runnerId);
  const now = Date.now();
  let today = 0;
  let week = 0;
  let month = 0;

  for (const job of completed) {
    const at = job.completedAt ?? job.createdAt;
    const net = jobNet(job);
    if (isSameDay(at, now)) today += net;
    if (isSameWeek(at, now)) week += net;
    if (isSameMonth(at, now)) month += net;
  }

  const tripCount = completed.length;
  const avgPerTrip = tripCount > 0 ? Math.round((month / tripCount) * 100) / 100 : 0;

  return {
    today: Math.round(today * 100) / 100,
    week: Math.round(week * 100) / 100,
    month: Math.round(month * 100) / 100,
    tripCount,
    avgPerTrip,
  };
}

export function getRunnerEarningsRows(runnerId?: string, limit = 20): RunnerEarningsRow[] {
  return getRunnerCompletedJobs(runnerId)
    .slice(0, limit)
    .map((job) => {
      const gross = job.estimatedFare;
      const net = jobNet(job);
      const fee = Math.round((gross - net) * 100) / 100;
      return { job, gross, fee, net };
    });
}

export function getWeeklyEarningsBars(runnerId?: string): { day: string; amount: number; trips: number }[] {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const buckets = labels.map((day) => ({ day, amount: 0, trips: 0 }));

  for (const job of getRunnerCompletedJobs(runnerId)) {
    const at = new Date(job.completedAt ?? job.createdAt);
    const dayIndex = at.getDay();
    buckets[dayIndex].amount += jobNet(job);
    buckets[dayIndex].trips += 1;
  }

  // Rotate so week starts Monday for display
  const mondayFirst = [...buckets.slice(1), buckets[0]];
  void now;
  return mondayFirst.map((b) => ({
    ...b,
    amount: Math.round(b.amount * 100) / 100,
  }));
}
