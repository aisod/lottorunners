import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/verify-phone")({
  beforeLoad: () => {
    throw redirect({ to: "/customer/verify" });
  },
});
