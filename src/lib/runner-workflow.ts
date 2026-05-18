export type RunnerJobStatus = "arrived" | "in-progress";

export interface RunnerBankDetails {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  branchCode: string;
}

const RUNNER_BANK_DETAILS_KEY = "lr-runner-bank-details";
const RUNNER_ONLINE_KEY = "lr-runner-online-v1";

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
