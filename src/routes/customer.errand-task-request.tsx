import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/customer/errand-task-request")({
  beforeLoad: () => {
    throw redirect({ to: "/customer/choose-errand-type" });
  },
});
