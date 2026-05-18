import { createFileRoute } from "@tanstack/react-router";
import { CustomerSavedAddressesPage } from "./saved-addresses";

export const Route = createFileRoute("/customer/saved-addresses")({
  component: CustomerSavedAddressesPage,
});
