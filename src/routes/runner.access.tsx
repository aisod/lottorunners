import { createFileRoute, redirect } from "@tanstack/react-router";
import { getRunnerHomePath } from "@/lib/store";

export const Route = createFileRoute("/runner/access")({
  beforeLoad: () => {
    throw redirect({ to: getRunnerHomePath() });
  },
});
