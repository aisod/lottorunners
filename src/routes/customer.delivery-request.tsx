import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Box, FileText, HelpCircle, MapPin, Package } from "lucide-react";
import { useState } from "react";
import { CustomerHeaderLogo } from "@/components/customer-header-logo";
import { CustomerFixedFooter, CustomerPageShell, CustomerStickyHeader } from "@/components/customer-page-shell";
import { Button } from "@/components/ui/button";
import { goBackOrFallback } from "@/lib/customer-navigation";
import { routeFromAddresses } from "@/lib/customer-route";
import { validateDeliveryStep } from "@/lib/booking-validation";
import { useCustomerApp } from "@/lib/customer-store";

export const Route = createFileRoute("/customer/delivery-request")({
  component: CustomerDeliveryRequestPage,
});

function CustomerDeliveryRequestPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { setPickup, setDestination, setSelectedService, setStatus, setScheduleMode, setErrandDescription } =
    useCustomerApp();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deliveryType, setDeliveryType] = useState<"instant" | "scheduled">("instant");
  const [pickupAddress, setPickupAddress] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [packageSize, setPackageSize] = useState<"document" | "small_box" | "medium_box">("document");
  const [instructions, setInstructions] = useState("");

  const submit = () => {
    const validation = validateDeliveryStep(pickupAddress, recipientAddress, instructions);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setErrandDescription(instructions);
    const route = routeFromAddresses(pickupAddress, recipientAddress);
    setPickup(route.pickup);
    setDestination(route.destination);
    setSelectedService("delivery");
    setScheduleMode(deliveryType === "scheduled" ? "later" : "now");
    setStatus("estimating");
    navigate({ to: "/customer/review-schedule" });
  };

  return (
    <CustomerPageShell width="md" variant="plain" className="pb-28">
      <CustomerStickyHeader width="md">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => goBackOrFallback(router.history, () => navigate({ to: "/customer/home" }))}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-primary">New Delivery</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Help"
            onClick={() => window.alert("Delivery help: enter pickup and drop-off addresses, then continue to review.")}
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
          <CustomerHeaderLogo size="sm" />
        </div>
      </CustomerStickyHeader>

      <main className="space-y-6 py-6">
        <section className="rounded-xl bg-secondary/60 p-1">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setDeliveryType("instant")}
              className={`h-10 rounded-lg text-sm font-semibold transition ${
                deliveryType === "instant" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
              }`}
            >
              Instant
            </button>
            <button
              type="button"
              onClick={() => setDeliveryType("scheduled")}
              className={`h-10 rounded-lg text-sm font-semibold transition ${
                deliveryType === "scheduled" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
              }`}
            >
              Scheduled
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-foreground">Pickup Address</label>
            <div className="flex items-center rounded-xl border bg-card">
              <input
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="Enter pickup location"
                className="h-12 w-full rounded-xl bg-transparent px-4 text-sm outline-none"
              />
              <MapPin className="mr-4 h-5 w-5 text-primary" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-foreground">Recipient Address</label>
            <div className="flex items-center rounded-xl border bg-card">
              <input
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Enter delivery destination"
                className="h-12 w-full rounded-xl bg-transparent px-4 text-sm outline-none"
              />
              <MapPin className="mr-4 h-5 w-5 text-primary" />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">Package Size</h2>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <PackageCard
              label="Document"
              active={packageSize === "document"}
              onClick={() => setPackageSize("document")}
              icon={<FileText className="h-7 w-7" />}
            />
            <PackageCard
              label="Small Box"
              active={packageSize === "small_box"}
              onClick={() => setPackageSize("small_box")}
              icon={<Box className="h-7 w-7" />}
            />
            <PackageCard
              label="Medium Box"
              active={packageSize === "medium_box"}
              onClick={() => setPackageSize("medium_box")}
              icon={<Package className="h-7 w-7" />}
            />
          </div>
        </section>

        <section className="space-y-1">
          <label className="text-sm font-semibold text-foreground">Special Delivery Instructions</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Gate code, floor number, or specific delivery handling instructions..."
            className="min-h-24 w-full rounded-xl border bg-card p-4 text-sm outline-none"
          />
        </section>
      </main>

      <CustomerFixedFooter width="md">
        {Object.keys(errors).length > 0 ? (
          <p className="mb-2 text-sm text-destructive">{Object.values(errors)[0]}</p>
        ) : null}
        <Button className="h-12 w-full text-base font-bold" onClick={submit}>
          Estimate Delivery
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">Transparent pricing. No hidden fees.</p>
      </CustomerFixedFooter>
    </CustomerPageShell>
  );
}

function PackageCard({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition ${
        active ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-foreground"
      }`}
    >
      <div className="text-primary">{icon}</div>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}
