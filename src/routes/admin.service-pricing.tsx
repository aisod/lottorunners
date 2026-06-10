import { createFileRoute } from "@tanstack/react-router";
import { Bike, CarTaxiFront, PackageCheck, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PortalPageIntro, PortalSection } from "@/components/portal-primitives";
import {
  getPlatformPricing,
  savePlatformPricing,
  subscribePlatformPricing,
  type PlatformPricingConfig,
  type ServicePricingFields,
} from "@/lib/platform-pricing";
import { getServices } from "@/lib/services";
import type { TruckSizeId } from "@/lib/types";

export const Route = createFileRoute("/admin/service-pricing")({
  component: AdminServicePricingPage,
});

function AdminServicePricingPage() {
  const [config, setConfig] = useState<PlatformPricingConfig>(() => getPlatformPricing());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribePlatformPricing(() => setConfig(getPlatformPricing()));
  }, []);

  const save = () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    void savePlatformPricing(config).then((result) => {
      setSaving(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Pricing saved. Customer and business booking flows use these fares immediately.");
    });
  };

  const services = getServices();

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Pricing controls"
        title="Service & pricing configuration"
        description="Fares are saved to the database and apply to new bookings after save."
        action={
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save pricing"}
          </Button>
        }
      />

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">{message}</p>
      ) : null}

      <PortalSection
        title="Platform fee"
        description="Used in admin revenue analytics and runner payout calculations."
        bodyClassName="grid gap-4 sm:grid-cols-2 lg:max-w-md"
      >
        <PricingField
          label="Platform fee (%)"
          value={config.platformFeePercent}
          onChange={(v) => setConfig((c) => ({ ...c, platformFeePercent: v }))}
        />
      </PortalSection>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <ServiceCard
          title="Ride"
          description={services.ride.tagline}
          icon={<CarTaxiFront className="h-5 w-5" />}
          fields={config.ride}
          onChange={(ride) => setConfig((c) => ({ ...c, ride }))}
        />
        <ServiceCard
          title="Errand"
          description={services.errand.tagline}
          icon={<Bike className="h-5 w-5" />}
          fields={config.errand}
          onChange={(errand) => setConfig((c) => ({ ...c, errand }))}
        />
        <ServiceCard
          title="Delivery"
          description={services.delivery.tagline}
          icon={<PackageCheck className="h-5 w-5" />}
          fields={config.delivery}
          onChange={(delivery) => setConfig((c) => ({ ...c, delivery }))}
        />
        <ServiceCard
          title="Truck (per km)"
          description={services.truck.tagline}
          icon={<Truck className="h-5 w-5" />}
          fields={config.truck}
          onChange={(truck) => setConfig((c) => ({ ...c, truck }))}
          extra={
            <div className="space-y-3 border-t border-border/60 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Truck size base (N$)</p>
              {(["small", "medium", "large"] as TruckSizeId[]).map((size) => (
                <PricingField
                  key={size}
                  label={size.charAt(0).toUpperCase() + size.slice(1)}
                  value={config.truckSizeBase[size]}
                  onChange={(v) =>
                    setConfig((c) => ({
                      ...c,
                      truckSizeBase: { ...c.truckSizeBase, [size]: v },
                    }))
                  }
                />
              ))}
              <PricingField
                label="Labour add-on (N$)"
                value={config.truckLabourFee}
                onChange={(v) => setConfig((c) => ({ ...c, truckLabourFee: v }))}
              />
              <PricingField
                label="Extra helper (N$ each)"
                value={config.truckExtraHelperFee}
                onChange={(v) => setConfig((c) => ({ ...c, truckExtraHelperFee: v }))}
              />
            </div>
          }
        />
      </div>
    </div>
  );
}

function ServiceCard({
  title,
  description,
  icon,
  fields,
  onChange,
  extra,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  fields: ServicePricingFields;
  onChange: (next: ServicePricingFields) => void;
  extra?: React.ReactNode;
}) {
  return (
    <PortalSection title={title} description={description} className="min-w-0" bodyClassName="space-y-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <PricingField label="Base fare (N$)" value={fields.baseFare} onChange={(v) => onChange({ ...fields, baseFare: v })} />
      <PricingField label="Per km (N$)" value={fields.perKm} onChange={(v) => onChange({ ...fields, perKm: v })} />
      <PricingField label="Base ETA (minutes)" value={fields.etaMin} onChange={(v) => onChange({ ...fields, etaMin: v })} />
      {extra}
    </PortalSection>
  );
}

function PricingField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <Input
        type="number"
        min={0}
        step={1}
        className="mt-2"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      />
    </div>
  );
}
