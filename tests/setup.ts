import { afterEach, beforeEach } from "vitest";

const STORAGE_KEYS = [
  "lr-auth-session-v1",
  "lr-marketplace-jobs-v1",
  "lr-runner-declined-jobs-v1",
  "lr-users-v1",
  "lottorunners-runner-services-v1",
];

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  for (const key of STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
});
