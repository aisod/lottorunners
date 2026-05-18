import { createFileRoute } from "@tanstack/react-router";
import { CustomerActivityPage } from "./activity";

export const Route = createFileRoute("/customer/activity")({
  head: () => ({
    meta: [
      { title: "Activity — Lotto Runners" },
      { name: "description", content: "Your past trips and errands." },
    ],
  }),
  component: CustomerActivityPage,
});
