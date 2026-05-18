import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bike, CarTaxiFront, PackageCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageIntro, PortalSection, StatusPill } from "@/components/portal-primitives";

export const Route = createFileRoute("/admin/service-pricing")({
  component: AdminServicePricingPage,
});

function AdminServicePricingPage() {
  const [baseTaxi, setBaseTaxi] = useState(45);
  const [platformFeePct, setPlatformFeePct] = useState(12);
  const [perKm, setPerKm] = useState(8);
  const [errandMultiplier, setErrandMultiplier] = useState(1.15);
  const [deliveryBase, setDeliveryBase] = useState(30);
  const [truckBase, setTruckBase] = useState(250);

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Pricing controls"
        title="Service & pricing configuration"
        description="Adjust platform fees, base fares, and service defaults. Inputs stay local to this prototype."
        action={<Button type="button">Save changes</Button>}
      />

      <div className="grid gap-6 xl:grid-cols-4">
        <PortalSection title="Taxi" description="Base and distance charges." className="xl:col-span-1" bodyClassName="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CarTaxiFront className="h-5 w-5" />
            </div>
            <StatusPill tone="primary">Active</StatusPill>
          </div>
          <Field label="Base fare (N$)" value={baseTaxi} onChange={setBaseTaxi} min={0} max={200} />
          <Field label="Per km (N$)" value={perKm} onChange={setPerKm} min={0} max={50} />
        </PortalSection>

        <PortalSection title="Errand" description="Urgency and manual handling." className="xl:col-span-1" bodyClassName="space-y-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bike className="h-5 w-5" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Urgency uplift (x)</label>
            <input
              type="number"
              step={0.05}
              value={errandMultiplier}
              onChange={(e) => setErrandMultiplier(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
            />
          </div>
          <Field label="Platform fee (%)" value={platformFeePct} onChange={setPlatformFeePct} min={0} max={35} />
        </PortalSection>

        <PortalSection title="Delivery" description="Parcel and document runs." className="xl:col-span-1" bodyClassName="space-y-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <PackageCheck className="h-5 w-5" />
          </div>
          <Field label="Base fee (N$)" value={deliveryBase} onChange={setDeliveryBase} min={0} max={200} />
          <Field label="Per km (N$)" value={6} onChange={() => {}} min={0} max={20} />
        </PortalSection>

        <PortalSection title="Truck" description="Large-item and heavy cargo." className="xl:col-span-1" bodyClassName="space-y-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Truck className="h-5 w-5" />
          </div>
          <Field label="Starting fee (N$)" value={truckBase} onChange={setTruckBase} min={0} max={2000} />
          <Field label="Per km (N$)" value={18} onChange={() => {}} min={0} max={40} />
        </PortalSection>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 flex-1 accent-primary"
        />
        <span className="w-12 tabular-nums text-sm font-bold text-primary">{value}</span>
      </div>
    </div>
  );
}
