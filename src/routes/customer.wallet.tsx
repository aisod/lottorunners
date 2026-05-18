import { createFileRoute } from "@tanstack/react-router";
import { CustomerWalletPage } from "./wallet";

export const Route = createFileRoute("/customer/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — Lotto Runners" },
      { name: "description", content: "Your Lotto Runners wallet balance and transactions." },
    ],
  }),
  component: CustomerWalletPage,
});
