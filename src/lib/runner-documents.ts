const DOCS_STORAGE_KEY = "lr-runner-documents-v1";

export type RunnerDocumentKey = "profilePhoto" | "nationalId" | "license" | "insurance";

export type RunnerDocumentUrls = Partial<Record<RunnerDocumentKey, string>>;

export function readLocalRunnerDocuments(email: string): RunnerDocumentUrls {
  if (typeof window === "undefined") return {};

  const raw = window.localStorage.getItem(DOCS_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, RunnerDocumentUrls>;
    return parsed[email] ?? {};
  } catch {
    return {};
  }
}

export function writeLocalRunnerDocuments(email: string, patch: RunnerDocumentUrls): RunnerDocumentUrls {
  if (typeof window === "undefined") return patch;

  const raw = window.localStorage.getItem(DOCS_STORAGE_KEY);
  let all: Record<string, RunnerDocumentUrls> = {};
  if (raw) {
    try {
      all = JSON.parse(raw) as Record<string, RunnerDocumentUrls>;
    } catch {
      all = {};
    }
  }

  const next = { ...(all[email] ?? {}), ...patch };
  all[email] = next;
  window.localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(all));
  return next;
}
