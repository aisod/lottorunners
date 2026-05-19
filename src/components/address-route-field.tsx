import { MapPin } from "lucide-react";
import { AddressSearchInput } from "@/components/address-search-input";
import type { RouteStop } from "@/lib/geocode-address";
import type { LatLng } from "@/lib/types";

export function AddressRouteField({
  label,
  value,
  onChange,
  stop,
  onSelectStop,
  near,
  field,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  stop: RouteStop | null;
  onSelectStop: (stop: RouteStop) => void;
  near: LatLng | null;
  field: "pickup" | "destination";
  placeholder?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <div className="flex items-center rounded-xl border bg-card">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-12 w-full rounded-xl bg-transparent px-4 text-sm outline-none"
        />
        <MapPin className="mr-4 h-5 w-5 shrink-0 text-primary" />
      </div>
      {stop ? (
        <p className="text-[11px] text-muted-foreground">
          Selected: {stop.label} ({stop.coord.lat.toFixed(4)}, {stop.coord.lng.toFixed(4)})
        </p>
      ) : null}
      <AddressSearchInput
        near={near}
        field={field}
        className="mt-2"
        onPick={(r) => onSelectStop({ label: r.shortLabel, coord: r.coord })}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
