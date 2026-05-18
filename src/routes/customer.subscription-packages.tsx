import { createFileRoute } from "@tanstack/react-router";
import { CustomerSubscriptionPackagesPage } from "./subscription-packages";

export const Route = createFileRoute("/customer/subscription-packages")({
  component: CustomerSubscriptionPackagesPage,
});
