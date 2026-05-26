import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bolt, CalendarClock, MapPin, Navigation2, ShieldCheck, Wallet } from "lucide-react";
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
import {
  getServices,
  getTruckExtraHelperFeeNad,
  getTruckLabourFeeNad,
  getTruckSizeBaseNad,
} from "@/lib/services";
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
    pickup,
    destination,
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
      ? getTruckSizeBaseNad()[tier] +
        (truckLabour ? getTruckLabourFeeNad() : 0) +
        truckExtraHelpers * getTruckExtraHelperFeeNad()
      : 0;
  const baseFare =
    selectedService === "truck" ? truckFixed : selectedService === "ride" ? 30 : selectedService === "delivery" ? 20 : 25;
  const distanceFee = Math.max(0, total - baseFare - 5);
  const platformFee = 5;
  const errandServiceLabel = errandCategory ? ERRAND_CATEGORIES[errandCategory]?.label ?? "Errand service" : "Errand service";
  const heroLabel =
    selectedService === "ride"
      ? getServices().ride.label
      : selectedService === "delivery"
        ? getServices().delivery.label
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
    if (submitting) return;

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

    /** Zustand updates synchronously; React `store` from render can lag — read fresh snapshot for validation & job create. */
    const bookingState = useCustomerApp.getState();
    const validation = validateBooking(bookingState);
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
      const result = await createJobFromCustomerBooking(bookingState as unknown as Parameters<typeof createJobFromCustomerBooking>[0], customerId);
      if (!result.job) {
        setFormErrors({ submit: result.error ?? "Could not create your request. Try again." });
        return;
      }

      const scheduledTs = result.job.scheduledAt ?? bookingState.scheduledAt;
      const isLaterScheduled =
        bookingState.scheduleMode === "later" &&
        typeof scheduledTs === "number" &&
        scheduledTs > Date.now();

      if (isLaterScheduled) {
        setActiveJobId(null);
        setStatus("idle");
        navigate({
          to: "/customer/scheduled-booking",
          search: { at: scheduledTs, jobId: result.job.id },
        });
        return;
      }

      setActiveJobId(result.job.id);
      setStatus("searching");
      navigate({ to: "/customer/matching-runner" });
    } finally {
      setSubmitting(false);
    }
  };

  const pickupShort = pickup?.label ?? "Pickup not set";
  const destinationShort = destination?.label ?? "Destination not set";

  return (
    <CustomerPageShell width="md" variant="plain" className="pb-32">
      <CustomerStickyHeader width="md" className="border-b border-border/40 bg-background/80 backdrop-blur-md">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: backTo })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-black text-primary">{serviceTitle(selectedService)}</h1>
        <CustomerHeaderLogo size="sm" />
      </CustomerStickyHeader>

      <main className="relative space-y-5 py-5">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_90%_70%_at_50%_-10%,oklch(0.88_0.08_250/0.45),transparent),radial-gradient(ellipse_60%_50%_at_100%_0%,oklch(0.92_0.06_220/0.35),transparent)]"
          aria-hidden
        />

        <section className="overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-[0_12px_40px_-16px_rgba(0,93,152,0.35)]">
          <div className="relative overflow-hidden bg-[linear-gradient(125deg,oklch(0.42_0.12_250),oklch(0.55_0.14_248)_45%,oklch(0.72_0.1_230))] px-5 pb-6 pt-5 text-primary-foreground">
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute bottom-0 left-0 h-24 w-full bg-[linear-gradient(0deg,oklch(0.42_0.12_250/0.4),transparent)]"
              aria-hidden
            />
            <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">
              Lotto Runners
            </p>
            <div className="relative mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                {heroLabel}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                {distanceKm.toFixed(1)} km route
              </span>
            </div>
            <h2 className="relative mt-3 text-2xl font-bold tracking-tight">Review your booking</h2>
            <p className="relative mt-2 max-w-md text-sm leading-relaxed text-primary-foreground/90">
              {scheduleMode === "later"
                ? "Confirm your slot — we match you with a runner closer to that time."
                : "Confirm schedule and payment before we match you with a nearby runner."}
            </p>
          </div>

          {(pickup || destination) && (
            <div className="divide-y divide-border/50 bg-muted/25 px-4 py-3">
              <div className="flex items-center gap-3 py-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Navigation2 className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pick up</p>
                  <p className="truncate text-sm font-medium text-foreground">{pickupShort}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <MapPin className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Destination</p>
                  <p className="truncate text-sm font-medium text-foreground">{destinationShort}</p>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Schedule for</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">When should we send a runner?</p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={selectNow}
              className={cn(
                "group relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98]",
                scheduleMode === "now"
                  ? "border-primary bg-primary/[0.07] shadow-[0_8px_24px_-12px_rgba(0,93,152,0.45)]"
                  : "border-border/60 bg-background hover:border-primary/30 hover:bg-muted/40",
              )}
            >
              <div
                className={cn(
                  "mb-3 flex h-11 w-11 items-center justify-center rounded-2xl transition-colors",
                  scheduleMode === "now" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <Bolt className="h-5 w-5" aria-hidden />
              </div>
              <p className={cn("font-semibold", scheduleMode === "now" ? "text-primary" : "text-foreground")}>Now</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Priority dispatch</p>
            </button>
            <button
              type="button"
              onClick={selectLater}
              className={cn(
                "group relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98]",
                scheduleMode === "later"
                  ? "border-primary bg-primary/[0.07] shadow-[0_8px_24px_-12px_rgba(0,93,152,0.45)]"
                  : "border-border/60 bg-background hover:border-primary/30 hover:bg-muted/40",
              )}
            >
              <div
                className={cn(
                  "mb-3 flex h-11 w-11 items-center justify-center rounded-2xl transition-colors",
                  scheduleMode === "later" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <CalendarClock className="h-5 w-5" aria-hidden />
              </div>
              <p className={cn("font-semibold", scheduleMode === "later" ? "text-primary" : "text-foreground")}>Later</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Select date and time</p>
            </button>
          </div>

          {scheduleMode === "later" ? (
            <div className="mt-4 space-y-3 rounded-2xl border border-dashed border-primary/25 bg-secondary/30 p-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-12 w-full justify-start rounded-xl border-border/60 bg-card font-normal shadow-sm"
                  >
                    <CalendarClock className="mr-2 h-4 w-4 text-primary" aria-hidden />
                    {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-2xl border-border/60 p-0 shadow-xl" align="start">
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
                <label
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  htmlFor="schedule-time"
                >
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
                  className="mt-2 h-12 w-full rounded-xl border border-border/60 bg-card px-4 text-sm shadow-sm outline-none ring-primary/25 focus:ring-2"
                />
              </div>

              {scheduledLabel ? (
                <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5 text-sm text-primary">
                  <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    Scheduled for <span className="font-semibold">{scheduledLabel}</span>
                  </span>
                </div>
              ) : null}
              {scheduleError ? <p className="text-sm text-destructive">{scheduleError}</p> : null}
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
              <Bolt className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              Ready for immediate matching after you confirm.
            </div>
          )}
        </section>

        {Object.keys(formErrors).length > 0 ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 shadow-sm">
            <p className="text-sm font-semibold text-destructive">Please fix the following:</p>
            <ul className="mt-2 list-inside list-disc text-sm text-destructive">
              {Object.values(formErrors).map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
          <div className="border-b border-border/50 bg-muted/30 px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">Fare breakdown</h2>
            <p className="text-xs text-muted-foreground">Transparent pricing before you confirm</p>
          </div>
          <div className="space-y-3 p-4">
            <Row label="Base fare" value={baseFare} />
            <Row label={`Distance (${distanceKm.toFixed(1)} km)`} value={distanceFee} />
            <Row label="Platform fee" value={platformFee} />
          </div>
          <div className="flex items-center justify-between border-t border-border/50 bg-primary/[0.06] px-4 py-4">
            <span className="text-base font-semibold text-foreground">Total</span>
            <span className="text-2xl font-bold tracking-tight text-primary">N$ {total.toFixed(2)}</span>
          </div>
        </section>

        <section className="flex items-center justify-between gap-4 rounded-2xl border border-border/50 bg-gradient-to-r from-card via-card to-secondary/40 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Wallet className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Wallet</p>
              <p className="text-xs text-muted-foreground">Balance: {formatWalletBalance()}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 rounded-xl" onClick={() => navigate({ to: "/customer/payment-methods" })}>
            Change
          </Button>
        </section>

        <div className="flex items-start gap-2 rounded-2xl border border-border/40 bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>Verified runners · Secure wallet payment · Live tracking once matched</span>
        </div>
      </main>

      <CustomerFixedFooter width="md" className="border-t border-border/50 bg-background/95 backdrop-blur-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center justify-between rounded-xl bg-secondary/50 px-4 py-2.5 sm:max-w-[140px]">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-primary">N$ {total.toFixed(2)}</p>
          </div>
          <div className="min-w-0 flex-1">
            {formErrors.submit ? <p className="mb-2 text-sm text-destructive">{formErrors.submit}</p> : null}
            <Button className="h-12 w-full text-base shadow-md" disabled={confirmDisabled} onClick={handleConfirm}>
              {submitting ? "Posting request…" : "Confirm & Request Runner"}
            </Button>
          </div>
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
