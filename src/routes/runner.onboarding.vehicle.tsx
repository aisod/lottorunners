import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Camera, Car, ChevronRight, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { RunnerOnboardingProgress } from "@/components/runner-onboarding-progress";
import { RunnerProfileAvatar } from "@/components/runner-profile-avatar";
import { Button } from "@/components/ui/button";
import { persistRunnerOnboardingStage } from "@/lib/runner-account";

export const Route = createFileRoute("/runner/onboarding/vehicle")({
  component: RunnerOnboardingVehiclePage,
});

function RunnerOnboardingVehiclePage() {
  const navigate = useNavigate();
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const [vehicleType, setVehicleType] = useState("");
  const [makeModel, setMakeModel] = useState("");
  const [year, setYear] = useState("");
  const [registration, setRegistration] = useState("");
  const [photoName, setPhotoName] = useState<string | null>(null);

  const canContinue = Boolean(vehicleType && makeModel.trim() && year.trim() && registration.trim());

  return (
    <div className="min-h-dvh bg-background pb-28">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background px-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/runner/onboarding/documents" })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-primary">Runner setup</h1>
        </div>
        <RunnerProfileAvatar size="sm" />
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
        <div>
          <h2 className="text-2xl font-bold">Vehicle Details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Provide the vehicle you will use on the Lotto Runners network.
          </p>
        </div>

        <RunnerOnboardingProgress current="vehicle" />

        <section className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 rounded-xl border bg-card p-4">
            <label className="text-sm font-semibold" htmlFor="vehicle_type">
              Vehicle Type
            </label>
            <div className="relative mt-2">
              <select
                id="vehicle_type"
                value={vehicleType}
                onChange={(event) => setVehicleType(event.target.value)}
                className="h-12 w-full appearance-none rounded-lg border bg-background px-3 pr-10 text-sm outline-none ring-primary/30 focus:ring"
              >
                <option value="">Select vehicle type</option>
                <option value="sedan">Sedan</option>
                <option value="suv">SUV</option>
                <option value="bakkie">Bakkie</option>
                <option value="truck">Truck</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <label className="text-sm font-semibold" htmlFor="make_model">
              Vehicle Make &amp; Model
            </label>
            <input
              id="make_model"
              value={makeModel}
              onChange={(event) => setMakeModel(event.target.value)}
              placeholder="e.g. Toyota Hilux"
              className="mt-2 h-12 w-full rounded-lg border bg-background px-3 text-sm outline-none ring-primary/30 focus:ring"
            />
          </div>

          <div className="rounded-xl border bg-card p-4">
            <label className="text-sm font-semibold" htmlFor="year">
              Year
            </label>
            <input
              id="year"
              type="number"
              inputMode="numeric"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              placeholder="YYYY"
              className="mt-2 h-12 w-full rounded-lg border bg-background px-3 text-sm outline-none ring-primary/30 focus:ring"
            />
          </div>

          <div className="md:col-span-2 rounded-xl border bg-card p-4">
            <label className="text-sm font-semibold" htmlFor="reg_number">
              Registration Number
            </label>
            <input
              id="reg_number"
              value={registration}
              onChange={(event) => setRegistration(event.target.value)}
              placeholder="Enter number plate"
              className="mt-2 h-12 w-full rounded-lg border bg-background px-3 text-sm outline-none ring-primary/30 focus:ring"
            />
          </div>
        </section>

        <section className="rounded-xl border border-dashed bg-secondary/30 p-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Car className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold">Vehicle Photo</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Upload a clear photo showing your vehicle and license plate.
            </p>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setPhotoName(file?.name ?? null);
              }}
            />
            <div className="mt-5 grid w-full max-w-md grid-cols-1 gap-3 md:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 gap-2 border-2 border-primary text-primary"
                onClick={() => {
                  const input = photoInputRef.current;
                  if (!input) return;
                  input.removeAttribute("capture");
                  input.click();
                }}
              >
                <Upload className="h-4 w-4" />
                Upload Gallery
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-12 gap-2"
                onClick={() => {
                  const input = photoInputRef.current;
                  if (!input) return;
                  input.setAttribute("capture", "environment");
                  input.click();
                }}
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </Button>
            </div>
            {photoName ? <p className="mt-3 text-xs text-muted-foreground">Selected: {photoName}</p> : null}
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-2xl">
          <Button
            className="h-12 w-full gap-2 text-base"
            disabled={!canContinue}
            onClick={() => {
              persistRunnerOnboardingStage("banking");
              navigate({ to: "/runner/onboarding/banking" });
            }}
          >
            Continue to payout details
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
