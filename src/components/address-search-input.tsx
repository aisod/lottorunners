import { MapPin, Search } from "lucide-react";
import { useState } from "react";
import { useAddressSearch } from "@/lib/use-address-search";
import { cn } from "@/lib/utils";
import type { LatLng } from "@/lib/types";

export function AddressSearchInput({
  near,
  field,
  onPick,
  className,
  variant = "default",
}: {
  near: LatLng | null;
  field: "pickup" | "destination";
  onPick: (r: { shortLabel: string; coord: LatLng }) => void;
  className?: string;
  /** Compact: pill search + tight results (embedded in location rows). */
  variant?: "default" | "inline";
}) {
  const [q, setQ] = useState("");
  const { results, loading } = useAddressSearch(q, near);

  const isInline = variant === "inline";
  const showResultsPanel = results.length > 0 || (q.length >= 3 && !loading);

  return (
    <div className={className}>
      <div
        className={cn(
          "flex items-center gap-2.5 bg-background px-3",
          isInline
            ? "rounded-full border-0 bg-muted/60 py-2 pl-3.5 pr-3 ring-1 ring-transparent transition-[box-shadow] focus-within:bg-muted/80 focus-within:ring-primary/25"
            : "rounded-xl border border-border py-0.5",
        )}
      >
        <Search
          className={cn("shrink-0 text-muted-foreground", isInline ? "h-4 w-4 opacity-70" : "h-4 w-4")}
          aria-hidden
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={isInline ? "Search or adjust address" : `Search ${field} address…`}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/65 focus:outline-none",
            isInline ? "py-0.5 text-[15px] leading-snug" : "py-2.5 text-sm",
          )}
        />
        {loading ? (
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">…</span>
        ) : null}
      </div>

      {isInline ? (
        showResultsPanel ? (
          <div className="mt-2 max-h-44 overflow-y-auto overscroll-contain rounded-xl border border-border/50 bg-card shadow-sm">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  onPick(r);
                  setQ("");
                }}
                className="flex w-full items-center gap-2 border-b border-border/40 px-3 py-2.5 text-left last:border-b-0 hover:bg-muted/50 active:bg-muted/70"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-snug">{r.shortLabel}</span>
              </button>
            ))}
            {q.length >= 3 && !loading && results.length === 0 ? (
              <p className="px-3 py-2.5 text-center text-[12px] text-muted-foreground">No matches — try map pin</p>
            ) : null}
          </div>
        ) : null
      ) : (
        <div className="mt-1 max-h-40 space-y-0.5 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onPick(r);
                setQ("");
              }}
              className="flex w-full items-start gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-secondary/80"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/90 text-muted-foreground">
                <MapPin className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{r.shortLabel}</div>
                <div className="truncate text-[11px] text-muted-foreground">{r.label}</div>
              </div>
            </button>
          ))}
          {q.length >= 3 && !loading && results.length === 0 && (
            <p className="px-1.5 py-1.5 text-[11px] text-muted-foreground">
              No matches. Refine the address or set a pin on the home map.
            </p>
          )}
          {q.length < 3 && (
            <p className="px-1.5 pt-0.5 text-[11px] text-muted-foreground">
              Type 3+ letters to search, or set a pin on the home map.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
