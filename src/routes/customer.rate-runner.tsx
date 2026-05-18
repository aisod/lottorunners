import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CustomerBrandMark } from "@/components/customer-header-logo";
import { CustomerPageShell } from "@/components/customer-page-shell";
import { Button } from "@/components/ui/button";
import { useCustomerApp } from "@/lib/customer-store";

export const Route = createFileRoute("/customer/rate-runner")({
  component: CustomerRateRunnerPage,
});

function CustomerRateRunnerPage() {
  const navigate = useNavigate();
  const completeBooking = useCustomerApp((s) => s.completeBooking);
  const [rating, setRating] = useState(5);

  const submit = () => {
    completeBooking(rating);
    navigate({ to: "/customer/home" });
  };

  return (
    <CustomerPageShell width="sm" variant="auth">
      <div className="px-2 py-6 text-center sm:px-4">
        <CustomerBrandMark className="mb-6" />
        <h1 className="text-2xl font-bold">Rate your runner</h1>
        <p className="mt-2 text-sm text-muted-foreground">How was your experience?</p>
        <div className="mt-6 flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`h-10 w-10 rounded-full transition ${
                rating >= n ? "bg-primary text-primary-foreground" : "bg-secondary"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <Button className="mt-8 h-12 w-full" onClick={submit}>
          Submit rating
        </Button>
      </div>
    </CustomerPageShell>
  );
}
