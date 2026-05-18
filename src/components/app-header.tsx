import { Link } from "@tanstack/react-router";
import logo from "@/assets/lotto-runners-logo.png";
import { useCustomerApp } from "@/lib/customer-store";

const DEFAULT_HOME_LABEL = "Home";
const DEFAULT_HOME_ADDRESS = "123 Independence Ave, Windhoek";

function getHomeTitle(pickupLabel?: string) {
  if (!pickupLabel) return DEFAULT_HOME_LABEL;
  if (pickupLabel.startsWith("Home")) return DEFAULT_HOME_LABEL;
  return pickupLabel.split(" — ")[0] || DEFAULT_HOME_LABEL;
}

function getHomeAddress(pickupLabel?: string) {
  if (!pickupLabel) return DEFAULT_HOME_ADDRESS;
  const parts = pickupLabel.split(" — ");
  return parts.length > 1 ? parts.slice(1).join(" — ") : DEFAULT_HOME_ADDRESS;
}

export function AppHeader() {
  const { pickup, setPickup, userLocation } = useCustomerApp();
  const homeTitle = getHomeTitle(pickup?.label);
  const homeAddress = getHomeAddress(pickup?.label);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[800] flex items-center justify-between gap-3 bg-card/95 px-4 py-3 shadow-sm backdrop-blur">
      <button
        type="button"
        onClick={() => {
          if (userLocation) {
            setPickup({ coord: userLocation, label: `Home — ${DEFAULT_HOME_ADDRESS}` });
          }
        }}
        className="pointer-events-auto min-w-0 flex-1 text-left"
        aria-label="Home location"
      >
        <div className="font-semibold leading-tight text-foreground">{homeTitle}</div>
        <div className="truncate text-xs text-muted-foreground">{homeAddress}</div>
      </button>

      <Link
        to="/customer/home"
        className="pointer-events-auto flex h-8 w-8 shrink-0 items-center justify-center"
        aria-label="Lotto Runners"
      >
        <img src={logo} alt="" className="h-8 w-8 object-contain" />
      </Link>
    </header>
  );
}
