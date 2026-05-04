import { lazy, Suspense, useEffect, useState, type ComponentProps } from "react";

// react-leaflet imports `leaflet` at module load, which touches `window`.
// We must load it only in the browser to avoid SSR errors.
const LiveMapInner = lazy(() =>
  import("./live-map").then((m) => ({ default: m.LiveMap })),
);

type Props = ComponentProps<typeof LiveMapInner>;

export function LiveMapClient(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-full w-full bg-secondary">
        <div className="shimmer h-full w-full" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="h-full w-full bg-secondary">
          <div className="shimmer h-full w-full" />
        </div>
      }
    >
      <LiveMapInner {...props} />
    </Suspense>
  );
}
