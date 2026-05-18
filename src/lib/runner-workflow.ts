export type RunnerJobStatus = "arrived" | "in-progress";

export interface RunnerBankDetails {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  branchCode: string;
}

export interface RunnerMockJob {
  id: string;
  service: string;
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupEtaMinutes: number;
  distanceKm: number;
  estimatedPay: number;
  taskSummary: string;
  notes: string;
  acceptWindowSeconds: number;
}

const RUNNER_JOB_STATUS_KEY = "lr-runner-job-status";
const RUNNER_BANK_DETAILS_KEY = "lr-runner-bank-details";
const RUNNER_ONLINE_KEY = "lr-runner-online-v1";

export const RUNNER_MOCK_JOB: RunnerMockJob = {
  id: "RN-29402",
  service: "Document Delivery",
  customerName: "Johannes N.",
  pickupAddress: "Ministry of Finance, Independence Ave",
  dropoffAddress: "Town Square Offices, Robert Mugabe Ave",
  pickupEtaMinutes: 4,
  distanceKm: 6.8,
  estimatedPay: 185,
  taskSummary: "Collect stamped clearance documents and deliver them to the client reception desk.",
  notes: "Ask for Ms. Ndeshi at the records counter and upload a handover photo at delivery.",
  acceptWindowSeconds: 30,
};

export function getRunnerJobStatus(): RunnerJobStatus {
  if (typeof window === "undefined") return "arrived";

  const value = window.localStorage.getItem(RUNNER_JOB_STATUS_KEY);
  if (value === "arrived" || value === "in-progress") {
    return value;
  }

  // Legacy status from before en-route phase was removed
  if (value === "en-route") {
    return "arrived";
  }

  return "arrived";
}

export function setRunnerJobStatus(status: RunnerJobStatus): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RUNNER_JOB_STATUS_KEY, status);
}

export function clearRunnerJobStatus(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RUNNER_JOB_STATUS_KEY);
}

export function getRunnerOnline(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(RUNNER_ONLINE_KEY) === "true";
}

export function setRunnerOnline(online: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RUNNER_ONLINE_KEY, online ? "true" : "false");
}

export function clearRunnerOnline(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RUNNER_ONLINE_KEY);
}

export function getRunnerBankDetails(): RunnerBankDetails {
  if (typeof window === "undefined") {
    return {
      bankName: "Bank Windhoek",
      accountHolder: "Lukas Shilongo",
      accountNumber: "0145589021",
      branchCode: "482172",
    };
  }

  const rawValue = window.localStorage.getItem(RUNNER_BANK_DETAILS_KEY);
  if (!rawValue) {
    return {
      bankName: "Bank Windhoek",
      accountHolder: "Lukas Shilongo",
      accountNumber: "0145589021",
      branchCode: "482172",
    };
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<RunnerBankDetails>;
    return {
      bankName: parsed.bankName ?? "Bank Windhoek",
      accountHolder: parsed.accountHolder ?? "Lukas Shilongo",
      accountNumber: parsed.accountNumber ?? "0145589021",
      branchCode: parsed.branchCode ?? "482172",
    };
  } catch {
    return {
      bankName: "Bank Windhoek",
      accountHolder: "Lukas Shilongo",
      accountNumber: "0145589021",
      branchCode: "482172",
    };
  }
}

export function saveRunnerBankDetails(details: RunnerBankDetails): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RUNNER_BANK_DETAILS_KEY, JSON.stringify(details));
}

export function maskAccountNumber(accountNumber: string): string {
  const suffix = accountNumber.slice(-4);
  return `****${suffix}`;
}
