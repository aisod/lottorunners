import { createFileRoute } from "@tanstack/react-router";
import { CustomerProfilePage } from "./profile";

export const Route = createFileRoute("/customer/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Lotto Runners" },
      { name: "description", content: "Your Lotto Runners account and saved places." },
    ],
  }),
  component: CustomerProfilePage,
});
