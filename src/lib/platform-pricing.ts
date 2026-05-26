import type { ServiceConfig, ServiceType, TruckSizeId } from "./types";
import { fetchAppConfigValue, upsertAppConfigValue } from "./supabase/app-config-remote";
import { isSupabaseConfigured } from "./supabase/config";

const CONFIG_KEY = "marketplace_pricing";
const LOCAL_CACHE_KEY = "lr-marketplace-pricing-v1";

export type ServicePricingFields = {
  baseFare: number;
  perKm: number;
  etaMin: number;
};

export type PlatformPricingConfig = {
  errand: ServicePricingFields;
  ride: ServicePricingFields;
  delivery: ServicePricingFields;
  truck: ServicePricingFields;
  truckSizeBase: Record<TruckSizeId, number>;
  truckLabourFee: number;
  truckExtraHelperFee: number;
  platformFeePercent: number;
};

const DEFAULT_LABELS: Record<ServiceType, Omit<ServiceConfig, "id">> = {
  errand: {
    label: "Errand Runner",
    tagline: "A runner on foot or bike does it for you",
    icon: "🏃",
    baseFare: 25,
    perKm: 8,
    etaMin: 4,
    color: "accent",
  },
  ride: {
    label: "Ride",
    tagline: "Get picked up by a driver",
    icon: "🚗",
    baseFare: 30,
    perKm: 12,
    etaMin: 5,
    color: "primary",
  },
  delivery: {
    label: "Delivery",
    tagline: "Send a package, fast",
    icon: "🛵",
    baseFare: 20,
    perKm: 10,
    etaMin: 3,
    color: "chart-2",
  },
  truck: {
    label: "Truck",
    tagline: "Furniture, bulk goods, moving",
    icon: "🚛",
    baseFare: 120,
    perKm: 22,
    etaMin: 12,
    color: "chart-3",
  },
};

function buildDefaultConfig(): PlatformPricingConfig {
  return {
    errand: { baseFare: 25, perKm: 8, etaMin: 4 },
    ride: { baseFare: 30, perKm: 12, etaMin: 5 },
    delivery: { baseFare: 20, perKm: 10, etaMin: 3 },
    truck: { baseFare: 120, perKm: 22, etaMin: 12 },
    truckSizeBase: { small: 250, medium: 850, large: 1950 },
    truckLabourFee: 150,
    truckExtraHelperFee: 80,
    platformFeePercent: 15,
  };
}

let activeConfig: PlatformPricingConfig = buildDefaultConfig();

let activeServices: Record<ServiceType, ServiceConfig> = configToServices(activeConfig);

function configToServices(config: PlatformPricingConfig): Record<ServiceType, ServiceConfig> {
  const types: ServiceType[] = ["errand", "ride", "delivery", "truck"];
  const out = {} as Record<ServiceType, ServiceConfig>;
  for (const type of types) {
    const meta = DEFAULT_LABELS[type];
    const p = config[type];
    out[type] = {
      id: type,
      label: meta.label,
      tagline: meta.tagline,
      icon: meta.icon,
      color: meta.color,
      baseFare: p.baseFare,
      perKm: p.perKm,
      etaMin: p.etaMin,
    };
  }
  return out;
}

function applyConfig(config: PlatformPricingConfig): void {
  activeConfig = config;
  activeServices = configToServices(config);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event("lr-pricing-updated"));
  }
}

export function getPlatformPricing(): PlatformPricingConfig {
  return activeConfig;
}

/** Live service fares used across customer, business, and runner flows. */
export function getServices(): Record<ServiceType, ServiceConfig> {
  return activeServices;
}

export function getTruckSizeBaseNad(): Record<TruckSizeId, number> {
  return { ...activeConfig.truckSizeBase };
}

export function getTruckLabourFeeNad(): number {
  return activeConfig.truckLabourFee;
}

export function getTruckExtraHelperFeeNad(): number {
  return activeConfig.truckExtraHelperFee;
}

export function getPlatformFeePercent(): number {
  return activeConfig.platformFeePercent;
}

export async function hydratePlatformPricing(): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const cached = window.localStorage.getItem(LOCAL_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as Partial<PlatformPricingConfig>;
        const defaults = buildDefaultConfig();
        applyConfig({
          ...defaults,
          ...parsed,
          truckSizeBase: { ...defaults.truckSizeBase, ...parsed.truckSizeBase },
        });
      }
    } catch {
      // ignore
    }
  }

  if (!isSupabaseConfigured()) return;

  const raw = await fetchAppConfigValue(CONFIG_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw) as Partial<PlatformPricingConfig>;
    const defaults = buildDefaultConfig();
    applyConfig({
      ...defaults,
      ...parsed,
      truckSizeBase: { ...defaults.truckSizeBase, ...parsed.truckSizeBase },
    });
  } catch {
    // keep defaults
  }
}

export async function savePlatformPricing(
  config: PlatformPricingConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  applyConfig(config);

  if (!isSupabaseConfigured()) {
    return { ok: true };
  }

  return upsertAppConfigValue(CONFIG_KEY, JSON.stringify(config));
}

export function subscribePlatformPricing(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener();
  window.addEventListener("lr-pricing-updated", handler);
  return () => window.removeEventListener("lr-pricing-updated", handler);
}
