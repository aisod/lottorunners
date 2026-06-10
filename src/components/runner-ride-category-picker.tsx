import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { RIDE_CATEGORY_IDS, RIDE_CATEGORY_LABELS, type RideCategoryId } from "@/lib/ride-categories";
import { updateRemoteRideCategories } from "@/lib/supabase/profiles-remote";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useRunnerSettings } from "@/lib/runner-settings";
import { cn } from "@/lib/utils";

type RunnerRideCategoryPickerProps = {
  className?: string;
  description?: string;
};

export function RunnerRideCategoryPicker({ className, description }: RunnerRideCategoryPickerProps) {
  const rideCategories = useRunnerSettings((s) => s.rideCategories);
  const setRideCategories = useRunnerSettings((s) => s.setRideCategories);
  const [saveError, setSaveError] = useState<string | null>(null);

  const persistCategories = async (next: RideCategoryId[]) => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseClient();
    const userId = (await supabase?.auth.getSession())?.data.session?.user?.id;
    if (!userId) return;
    const result = await updateRemoteRideCategories(userId, next);
    if (!result.ok) {
      setSaveError(result.error);
    } else {
      setSaveError(null);
    }
  };

  const onToggle = (id: RideCategoryId) => {
    const cur = new Set(rideCategories);
    if (cur.has(id)) {
      if (cur.size <= 1) return;
      cur.delete(id);
    } else {
      cur.add(id);
    }
    const next = Array.from(cur) as RideCategoryId[];
    setRideCategories(next);
    void persistCategories(next);
  };

  return (
    <section className={cn("rounded-xl border bg-card p-4", className)}>
      <h3 className="text-sm font-semibold">Ride categories you accept</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {description ??
          "Only applies to taxi/ride jobs. You will only receive ride requests in the categories you select."}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {RIDE_CATEGORY_IDS.map((id) => {
          const active = rideCategories.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onToggle(id)}
              className={cn(
                "flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition",
                active ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-secondary/50",
              )}
            >
              <span>{RIDE_CATEGORY_LABELS[id]}</span>
              {active ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> : null}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">At least one ride category must stay selected.</p>
      {saveError ? <p className="mt-2 text-sm text-destructive">{saveError}</p> : null}
    </section>
  );
}
