import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bolt, CalendarClock, Wallet } from "lucide-react";
import { format, setHours, setMinutes, startOfDay } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { CustomerHeaderLogo } from "@/components/customer-header-logo";
import { CustomerFixedFooter, CustomerPageShell, CustomerStickyHeader } from "@/components/customer-page-shell";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatWalletBalance } from "@/lib/customer-wallet";
import { ERRAND_CATEGORIES } from "@/lib/errand-categories";
import { getUserPhone } from "@/lib/auth-users";
import { validateBooking } from "@/lib/booking-validation";
import { createJobFromCustomerBooking, getCurrentCustomerId } from "@/lib/jobs-service";
import { useCustomerApp } from "@/lib/customer-store";
import { SERVICES, TRUCK_EXTRA_HELPER_FEE_NAD, TRUCK_LABOUR_FEE_NAD, TRUCK_SIZE_BASE_NAD } from "@/lib/services";
import { cn } from "@/lib/utils";
import type { ServiceType } from "@/lib/types";

export const Route = createFileRoute("/customer/review-schedule")({
  component: CustomerReviewSchedulePage,
});

function serviceTitle(service: ServiceType | null): string {
  switch (service) {
    case "ride":
      return "Ride";
    case "delivery":
      return "Delivery";
    case "truck":
      return "Truck & moving";
    case "errand":
      return "Errand Services";
    default:
      return "Review booking";
  }
}

function defaultLaterTime(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function CustomerReviewSchedulePage() {
  const navigate = useNavigate();
  const store = useCustomerApp();
  const {
    buildEstimate,
    selectedService,
    errandCategory,
    setStatus,
    truckSizeId,
    truckLabour,
    truckExtraHelpers,
    scheduleMode,
    setScheduleMode,
    scheduledAt,
    setScheduledAt,
    setActiveJobId,
  } = store;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() =>
    scheduledAt ? new Date(scheduledAt) : undefined,
  );
  const [selectedTime, setSelectedTime] = useState(() =>
    scheduledAt ? format(new Date(scheduledAt), "HH:mm") : defaultLaterTime(),
  );
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (scheduleMode === "later" && !selectedDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(startOfDay(tomorrow));
    }
  }, [scheduleMode, selectedDate]);

  const estimate = buildEstimate();
  const total = estimate?.fare ?? 95;
  const distanceKm = estimate?.distanceKm ?? 8.4;

  const tier = truckSizeId ?? "small";
  const truckFixed =
    selectedService === "truck"
      ? TRUCK_SIZE_BASE_NAD[tier] + (truckLabour ? TRUCK_LABOUR_FEE_NAD : 0) + truckExtraHelpers * TRUCK_EXTRA_HELPER_FEE_NAD
      : 0;
  const baseFare =
    selectedService === "truck" ? truckFixed : selectedService === "ride" ? 30 : selectedService === "delivery" ? 20 : 25;
  const distanceFee = Math.max(0, total - baseFare - 5);
  const platformFee = 5;
  const errandServiceLabel = errandCategory ? ERRAND_CATEGORIES[errandCategory]?.label ?? "Errand service" : "Errand service";
  const heroLabel =
    selectedService === "ride"
      ? SERVICES.ride.label
      : selectedService === "delivery"
        ? SERVICES.delivery.label
        : selectedService === "truck"
          ? "Truck & moving"
          : errandServiceLabel;

  const backTo =
    selectedService === "truck"
      ? "/customer/moving-details"
      : selectedService === "delivery"
        ? "/customer/delivery-request"
        : errandCategory
          ? "/customer/errand-details"
          : "/customer/choose-service";

  const scheduledDateTime = useMemo(() => {
    if (!selectedDate || !selectedTime) return null;
    const [hours, minutes] = selectedTime.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return setMinutes(setHours(selectedDate, hours), minutes);
  }, [selectedDate, selectedTime]);

  const scheduledLabel =
    scheduleMode === "later" && scheduledDateTime
      ? format(scheduledDateTime, "EEE d MMM yyyy, HH:mm")
      : null;

  const selectNow = () => {
    setScheduleMode("now");
    setScheduleError(null);
  };

  const selectLater = () => {
    setScheduleMode("later");
    if (!selectedDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(startOfDay(tomorrow));
    }
    setScheduleError(null);
  };

  useEffect(() => {
    if (scheduleMode === "now") {
      setScheduledAt(null);
      return;
    }
    if (scheduledDateTime) {
      setScheduledAt(scheduledDateTime.getTime());
    }
  }, [scheduleMode, scheduledDateTime, setScheduledAt]);

  const confirmDisabled =
    submitting ||
    (scheduleMode === "later" &&
      (!selectedDate || !selectedTime || !scheduledDateTime || scheduledDateTime.getTime() <= Date.now()));

  const handleConfirm = async () => {
    if (scheduleMode === "later") {
      if (!scheduledDateTime) {
        setScheduleError("Select a date and time.");
        return;
      }
      if (scheduledDateTime.getTime() <= Date.now()) {
        setScheduleError("Scheduled time must be in the future.");
        return;
      }
      setScheduledAt(scheduledDateTime.getTime());
    } else {
      setScheduledAt(null);
    }
    setScheduleError(null);

    const validation = validateBooking(store);
    if (!validation.ok) {
      setFormErrors(validation.errors);
      return;
    }
    setFormErrors({});

    const customerId = getCurrentCustomerId();
    if (!customerId) {
      navigate({ to: "/customer/signin" });
      return;
    }

    if (!getUserPhone(customerId)) {
      navigate({ to: "/customer/profile-setup" });
      return;
    }

    setSubmitting(true);
    try {
      const result = await createJobFromCustomerBooking(store, customerId);
      if (!result.job) {
        setFormErrors({ submit: result.error ?? "Could not create your request. Try again." });
        return;
      }
      setActiveJobId(result.job.id);
      setStatus("searching");
      navigate({ to: "/customer/matching-runner" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CustomerPageShell width="md" variant="plain" className="pb-32">
      <CustomerStickyHeader width="md">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: backTo })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-black text-primary">{serviceTitle(selectedService)}</h1>
        <CustomerHeaderLogo size="sm" />
      </CustomerStickyHeader>

      <main className="space-y-6 py-5">
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="h-44 bg-[linear-gradient(135deg,oklch(0.92_0.04_258),oklch(0.72_0.14_258))] p-5 text-primary-foreground">
            <p className="text-sm font-medium opacity-90">Lotto Runners</p>
            <h2 className="mt-1 text-2xl font-bold">{heroLabel}</h2>
            <p className="mt-2 max-w-sm text-sm opacity-90">
              Confirm schedule and payment before we match you with a nearby runner.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Schedule for</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={selectNow}
              className={cn(
                "rounded-xl border-2 p-4 text-left transition",
                scheduleMode === "now" ? "border-primary bg-secondary" : "border-border bg-card",
              )}
            >
              <Bolt className={cn("mb-2 h-5 w-5", scheduleMode === "now" ? "text-primary" : "text-muted-foreground")} />
              <p className={cn("font-semibold", scheduleMode === "now" ? "text-primary" : "")}>Now</p>
              <p className="text-xs text-muted-foreground">Priority dispatch</p>
            </button>
            <button
              type="button"
              onClick={selectLater}
              className={cn(
                "rounded-xl border-2 p-4 text-left transition",
                scheduleMode === "later" ? "border-primary bg-secondary" : "border-border bg-card",
              )}
            >
              <CalendarClock
                className={cn("mb-2 h-5 w-5", scheduleMode === "later" ? "text-primary" : "text-muted-foreground")}
              />
              <p className={cn("font-semibold", scheduleMode === "later" ? "text-primary" : "")}>Later</p>
              <p className="text-xs text-muted-foreground">Select date and time</p>
            </button>
          </div>

          {scheduleMode === "later" ? (
            <div className="mt-3 space-y-3 rounded-xl border border-border bg-card p-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-11 w-full justify-start font-normal">
                    {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={{ before: startOfDay(new Date()) }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="schedule-time">
                  Time
                </label>
                <input
                  id="schedule-time"
                  type="time"
                  value={selectedTime}
                  onChange={(e) => {
                    setSelectedTime(e.target.value);
                    setScheduleError(null);
                  }}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2"
                />
              </div>

              {scheduledLabel ? (
                <p className="text-sm text-primary">
                  Scheduled for <span className="font-semibold">{scheduledLabel}</span>
                </p>
              ) : null}
              {scheduleError ? <p className="text-sm text-destructive">{scheduleError}</p> : null}
            </div>
          ) : null}
        </section>

        {Object.keys(formErrors).length > 0 ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm font-semibold text-destructive">Please fix the following:</p>
            <ul className="mt-2 list-inside list-disc text-sm text-destructive">
              {Object.values(formErrors).map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <section>
          <h2 className="mb-3 text-xl font-semibold">Fare Breakdown</h2>
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <Row label="Base Fare" value={baseFare} />
            <Row label={`Distance Fee (${distanceKm.toFixed(1)} km)`} value={distanceFee} />
            <Row label="Platform Fee" value={platformFee} />
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-xl font-bold text-primary">N$ {total.toFixed(2)}</span>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-secondary p-2">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Wallet</p>
                <p className="text-xs text-muted-foreground">Balance: {formatWalletBalance()}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/customer/payment-methods" })}>
              Change
            </Button>
          </div>
        </section>
      </main>

      <CustomerFixedFooter width="md">
        <div className="flex items-center gap-3">
          <div className="hidden min-w-24 sm:block">
            <p className="text-xs text-muted-foreground">Total fare</p>
            <p className="text-base font-semibold text-primary">N$ {total.toFixed(2)}</p>
          </div>
          {formErrors.submit ? (
            <p className="mb-2 w-full text-sm text-destructive">{formErrors.submit}</p>
          ) : null}
          <Button className="h-12 flex-1 text-base" disabled={confirmDisabled} onClick={handleConfirm}>
            {submitting ? "Posting request…" : "Confirm & Request Runner"}
          </Button>
        </div>
      </CustomerFixedFooter>
    </CustomerPageShell>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">N$ {value.toFixed(2)}</span>
    </div>
  );
}
