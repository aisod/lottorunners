import { fetchAppConfigValue, upsertAppConfigValue } from "./supabase/app-config-remote";
import { isSupabaseConfigured } from "./supabase/config";

const CONFIG_KEY = "admin_platform_settings";

export type AdminPlatformSettings = {
  maintenanceWindow: boolean;
  enforceMfa: boolean;
  apiReadOnly: boolean;
};

const DEFAULTS: AdminPlatformSettings = {
  maintenanceWindow: false,
  enforceMfa: true,
  apiReadOnly: false,
};

const LOCAL_KEY = "lr-admin-platform-settings-v1";

function readLocal(): AdminPlatformSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return { ...DEFAULTS, ...JSON.parse(raw) } as AdminPlatformSettings;
  } catch {
    return null;
  }
}

function writeLocal(settings: AdminPlatformSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(settings));
}

export async function loadAdminPlatformSettings(): Promise<AdminPlatformSettings> {
  if (!isSupabaseConfigured()) {
    return readLocal() ?? DEFAULTS;
  }

  const raw = await fetchAppConfigValue(CONFIG_KEY);
  if (!raw) {
    return readLocal() ?? DEFAULTS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AdminPlatformSettings>;
    const merged = { ...DEFAULTS, ...parsed };
    writeLocal(merged);
    return merged;
  } catch {
    return readLocal() ?? DEFAULTS;
  }
}

export async function saveAdminPlatformSettings(
  settings: AdminPlatformSettings,
): Promise<{ ok: true } | { ok: false; error: string }> {
  writeLocal(settings);

  if (!isSupabaseConfigured()) {
    return { ok: true };
  }

  return upsertAppConfigValue(CONFIG_KEY, JSON.stringify(settings));
}
