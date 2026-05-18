import { useNavigate } from "@tanstack/react-router";
import { SERVICE_ORDER, SERVICES } from "@/lib/services";
import { useCustomerApp } from "@/lib/customer-store";
import { cn } from "@/lib/utils";
import type { ServiceType } from "@/lib/types";

const ICONS: Record<ServiceType, React.ReactNode> = {
  errand: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1.5" />
      <circle cx="18" cy="21" r="1.5" />
      <path d="M2.5 3h2l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  ),
  ride: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17h14M6.5 12 8 7h8l1.5 5M5 17v3M19 17v3" />
      <rect x="4" y="12" width="16" height="6" rx="1.5" />
      <circle cx="8" cy="17" r="1" fill="currentColor" />
      <circle cx="16" cy="17" r="1" fill="currentColor" />
    </svg>
  ),
  delivery: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 16-9 5-9-5V8l9-5 9 5z" />
      <path d="M3.3 7 12 12l8.7-5M12 22V12" />
    </svg>
  ),
  truck: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 18V6H2v12h2" />
      <path d="M14 8h4l4 4v6h-2" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  ),
};

export function ServiceSelector() {
  const navigate = useNavigate();
  const { selectedService, setSelectedService, setStatus } = useCustomerApp();

  const choose = (id: ServiceType) => {
    setSelectedService(id);

    if (id === "errand") {
      setStatus("idle");
      navigate({ to: "/customer/choose-errand-type" });
      return;
    }

    if (id === "truck") {
      setStatus("idle");
      navigate({ to: "/customer/truck-size" });
      return;
    }

    if (id === "delivery") {
      setStatus("idle");
      navigate({ to: "/customer/delivery-request" });
      return;
    }

    setStatus("idle");
    navigate({ to: "/customer/choose-service" });
  };

  return (
    <div className="-mx-1 flex items-stretch gap-2">
      {SERVICE_ORDER.map((id) => {
        const svc = SERVICES[id];
        const active = selectedService === id;
        return (
          <button
            key={id}
            onClick={() => choose(id)}
            className={cn(
              "group flex flex-1 flex-col items-center gap-2 rounded-2xl py-4 transition-all",
              active
                ? "bg-primary text-primary-foreground shadow-[0_8px_20px_-8px_oklch(0.48_0.14_248/0.6)]"
                : "bg-secondary text-primary hover:bg-secondary/70",
            )}
          >
            <div className="flex h-7 items-center justify-center">{ICONS[id]}</div>
            <span className="text-[11px] font-bold uppercase tracking-wider">{svc.label.split(" ")[0]}</span>
          </button>
        );
      })}
    </div>
  );
}
