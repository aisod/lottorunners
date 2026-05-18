import { createFileRoute } from "@tanstack/react-router";
import { CustomerHomePage } from "@/components/customer-home-page";

export const Route = createFileRoute("/customer/home")({
  head: () => ({
    meta: [
      { title: "Lotto Runners — Errands, rides & deliveries on demand" },
      {
        name: "description",
        content:
          "Request errand runners, rides, deliveries and trucks in real time across Namibia. Live map, instant matching, in-app payment.",
      },
      { property: "og:title", content: "Lotto Runners — Uber for errands" },
      {
        property: "og:description",
        content: "Live map, four services, real-time tracking. Built for Namibia.",
      },
    ],
  }),
  component: CustomerHomePage,
});
