import { useState } from "react";
import { useAddressSearch } from "@/lib/use-address-search";
import type { LatLng } from "@/lib/types";

export function AddressSearchInput({
  near,
  field,
  onPick,
  className,
}: {
  near: LatLng | null;
  field: "pickup" | "destination";
  onPick: (r: { shortLabel: string; coord: LatLng }) => void;
  className?: string;
}) {
  const [q, setQ] = useState("");
  const { results, loading } = useAddressSearch(q, near);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
        <span className="text-muted-foreground">🔍</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${field} address…`}
          className="w-full bg-transparent py-2.5 text-sm focus:outline-none"
        />
        {loading && <span className="text-[11px] text-muted-foreground">…</span>}
      </div>
      <div className="mt-1 max-h-40 space-y-1 overflow-y-auto">
        {results.map((r, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              onPick(r);
              setQ("");
            }}
            className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-secondary"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">📍</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{r.shortLabel}</div>
              <div className="truncate text-[11px] text-muted-foreground">{r.label}</div>
            </div>
          </button>
        ))}
        {q.length >= 3 && !loading && results.length === 0 && (
          <p className="px-2 py-2 text-[11px] text-muted-foreground">
            No matches. Refine the address or set a pin on the home map.
          </p>
        )}
        {q.length < 3 && (
          <p className="px-2 pt-1 text-[11px] text-muted-foreground">
            Type 3+ letters to search, or set a pin on the home map.
          </p>
        )}
      </div>
    </div>
  );
}
