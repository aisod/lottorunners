import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/customer/pensioner")({
  beforeLoad: () => {
    throw redirect({ to: "/customer/subscription-packages" });
  },
});
