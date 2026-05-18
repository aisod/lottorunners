import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Nfc } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { CustomerPageShell } from "@/components/customer-page-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  formatCardNumber,
  loadSavedPaymentCard,
  savePaymentCard,
} from "@/lib/customer-payment-card";
import { useCustomerApp } from "@/lib/customer-store";

export const Route = createFileRoute("/customer/payment-methods")({
  component: CustomerPaymentMethodsPage,
});

function CustomerPaymentMethodsPage() {
  const navigate = useNavigate();
  const setPaymentMethod = useCustomerApp((s) => s.setPaymentMethod);
  const [cardholder, setCardholder] = useState("John Carter");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [saveForNextTime, setSaveForNextTime] = useState(true);

  useEffect(() => {
    const saved = loadSavedPaymentCard();
    if (saved) {
      setCardholder(saved.cardholder);
      setCardNumber(saved.cardNumber);
      setExpiry(saved.expiry);
      setSaveForNextTime(saved.saveForNextTime);
    } else {
      setCardNumber("3455456277103507");
      setExpiry("02/30");
    }
  }, []);

  const displayNumber = formatCardNumber(cardNumber) || "3455 4562 7710 3507";
  const canSave = cardholder.trim() && cardNumber.replace(/\D/g, "").length >= 12 && expiry.trim();

  const handleSave = () => {
    if (saveForNextTime) {
      savePaymentCard({ cardholder, cardNumber, expiry, saveForNextTime });
    }
    setPaymentMethod("card");
    navigate({ to: "/customer/wallet" });
  };

  return (
    <CustomerPageShell width="md" variant="plain" className="bg-muted/40 pb-28">
      <header className="sticky top-0 z-10 -mx-4 flex items-center gap-2 border-b border-border bg-background px-4 py-3 sm:-mx-6 sm:px-6">
        <Link
          to="/customer/wallet"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-secondary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-center font-display text-lg font-bold text-primary">Payment method</h1>
        <div className="h-9 w-9" />
      </header>

      <div className="space-y-6 py-5">
        <PaymentCardPreview
          cardNumber={displayNumber}
          cardholder={cardholder || "Card holder name"}
          expiry={expiry || "MM/YY"}
        />

        <div className="space-y-4 rounded-3xl bg-muted/60 p-4 sm:p-5">
          <PaymentFormField label="Cardholder name" htmlFor="cardholder">
            <input
              id="cardholder"
              value={cardholder}
              onChange={(e) => setCardholder(e.target.value)}
              placeholder="Card holder name"
              className={paymentInputClass}
            />
          </PaymentFormField>

          <PaymentFormField label="Card number" htmlFor="card-number">
            <input
              id="card-number"
              inputMode="numeric"
              value={formatCardNumber(cardNumber)}
              onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
              placeholder="Card number"
              className={paymentInputClass}
            />
          </PaymentFormField>

          <div className="grid grid-cols-2 gap-3">
            <PaymentFormField label="Expires" htmlFor="card-expiry">
              <input
                id="card-expiry"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value.slice(0, 5))}
                placeholder="MM/YY"
                className={paymentInputClass}
              />
            </PaymentFormField>
            <PaymentFormField label="CVV" htmlFor="card-cvv">
              <input
                id="card-cvv"
                inputMode="numeric"
                type="password"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Code"
                className={paymentInputClass}
              />
            </PaymentFormField>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <Label htmlFor="save-card" className="text-sm font-medium text-foreground">
              Save my card details for next time
            </Label>
            <Switch id="save-card" checked={saveForNextTime} onCheckedChange={setSaveForNextTime} />
          </div>
        </div>

        <Button className="h-12 w-full rounded-xl text-base font-semibold" disabled={!canSave} onClick={handleSave}>
          Save payment method
        </Button>
      </div>
    </CustomerPageShell>
  );
}

const paymentInputClass =
  "h-12 w-full rounded-xl border-0 bg-background/90 px-4 text-base shadow-sm outline-none ring-primary/30 transition placeholder:text-muted-foreground focus:ring-2";

function PaymentCardPreview({
  cardNumber,
  cardholder,
  expiry,
}: {
  cardNumber: string;
  cardholder: string;
  expiry: string;
}) {
  return (
    <div
      className="relative aspect-[1.58/1] w-full overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-lg"
      style={{ background: "var(--gradient-primary)" }}
    >
      <div
        className="pointer-events-none absolute -right-8 top-0 h-full w-2/3 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(1 0 0 / 0.35) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute right-0 top-0 h-full w-1/2"
        style={{
          backgroundImage:
            "repeating-radial-gradient(circle at 100% 50%, oklch(1 0 0 / 0.08) 0px, oklch(1 0 0 / 0.08) 2px, transparent 2px, transparent 12px)",
        }}
      />

      <div className="relative z-10 flex items-start justify-between">
        <Nfc className="h-8 w-8 opacity-95" strokeWidth={1.5} />
        <span className="text-2xl font-black italic tracking-wide">VISA</span>
      </div>

      <p className="relative z-10 mt-8 font-mono text-xl font-semibold tracking-[0.2em] sm:text-2xl">
        {cardNumber}
      </p>

      <div className="relative z-10 mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider opacity-75">Card holder name</p>
          <p className="mt-0.5 text-sm font-bold sm:text-base">{cardholder}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider opacity-75">Expiry date</p>
          <p className="mt-0.5 text-sm font-bold sm:text-base">{expiry}</p>
        </div>
        <div className="h-9 w-11 rounded-md bg-gradient-to-br from-amber-200 to-amber-400 shadow-inner" aria-hidden />
      </div>
    </div>
  );
}

function PaymentFormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
