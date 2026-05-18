import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Building2, Landmark, Nfc } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getRunnerBankDetails,
  maskAccountNumber,
  saveRunnerBankDetails,
} from "@/lib/runner-workflow";

export const Route = createFileRoute("/runner/payout-details")({
  component: RunnerPayoutDetailsPage,
});

const BANKS = ["Bank Windhoek", "FNB Namibia", "Standard Bank Namibia", "Nedbank Namibia"] as const;

const fieldClass =
  "h-12 w-full rounded-xl border-0 bg-background/90 px-4 text-base shadow-sm outline-none ring-primary/30 transition placeholder:text-muted-foreground focus:ring-2";

function RunnerPayoutDetailsPage() {
  const navigate = useNavigate();
  const [bankName, setBankName] = useState("Bank Windhoek");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branchCode, setBranchCode] = useState("");

  useEffect(() => {
    const details = getRunnerBankDetails();
    setBankName(details.bankName);
    setAccountHolder(details.accountHolder);
    setAccountNumber(details.accountNumber);
    setBranchCode(details.branchCode);
  }, []);

  const canSave =
    bankName.trim() && accountHolder.trim() && accountNumber.trim() && branchCode.trim();

  const handleSave = () => {
    saveRunnerBankDetails({ bankName, accountHolder, accountNumber, branchCode });
    navigate({ to: "/runner/settings" });
  };

  return (
    <div className="min-h-dvh bg-muted/40 pb-28">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background px-5">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/runner/settings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="flex-1 text-center text-lg font-bold text-primary">Payout details</h1>
        <div className="h-9 w-9" />
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-5 py-6">
        <PayoutCardPreview
          bankName={bankName}
          accountHolder={accountHolder || "Account holder"}
          accountNumber={accountNumber}
          branchCode={branchCode || "Branch"}
        />

        <div className="space-y-4 rounded-3xl bg-muted/60 p-4 sm:p-5">
          <FormField label="Bank name" htmlFor="bank-name">
            <select
              id="bank-name"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className={fieldClass}
            >
              {BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Account holder name" htmlFor="account-holder">
            <input
              id="account-holder"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="Account holder name"
              className={fieldClass}
            />
          </FormField>

          <FormField label="Account number" htmlFor="account-number">
            <input
              id="account-number"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 20))}
              placeholder="Account number"
              className={fieldClass}
            />
          </FormField>

          <FormField label="Branch code" htmlFor="branch-code">
            <input
              id="branch-code"
              value={branchCode}
              onChange={(e) => setBranchCode(e.target.value.slice(0, 12))}
              placeholder="Branch code"
              className={fieldClass}
            />
          </FormField>
        </div>

        <Button className="h-12 w-full rounded-xl text-base font-semibold" disabled={!canSave} onClick={handleSave}>
          Save payout details
        </Button>
      </main>
    </div>
  );
}

function PayoutCardPreview({
  bankName,
  accountHolder,
  accountNumber,
  branchCode,
}: {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  branchCode: string;
}) {
  const masked = accountNumber ? maskAccountNumber(accountNumber) : "**** •••• ••••";

  return (
    <div
      className="relative aspect-[1.58/1] w-full overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-lg"
      style={{ background: "var(--gradient-primary)" }}
    >
      <div
        className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-40"
        style={{
          backgroundImage:
            "repeating-radial-gradient(circle at 100% 50%, oklch(1 0 0 / 0.08) 0px, oklch(1 0 0 / 0.08) 2px, transparent 2px, transparent 12px)",
        }}
      />

      <div className="relative z-10 flex items-start justify-between">
        <Nfc className="h-8 w-8 opacity-95" strokeWidth={1.5} />
        <Building2 className="h-8 w-8 opacity-90" strokeWidth={1.5} />
      </div>

      <p className="relative z-10 mt-6 text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
        Weekly payout account
      </p>
      <p className="relative z-10 mt-2 font-mono text-xl font-semibold tracking-wider sm:text-2xl">{masked}</p>

      <div className="relative z-10 mt-6 flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider opacity-75">Account holder</p>
          <p className="mt-0.5 truncate text-sm font-bold sm:text-base">{accountHolder}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider opacity-75">Branch</p>
          <p className="mt-0.5 text-sm font-bold sm:text-base">{branchCode}</p>
        </div>
        <div className="flex h-9 w-11 items-center justify-center rounded-md bg-gradient-to-br from-amber-200 to-amber-400 shadow-inner">
          <Landmark className="h-5 w-5 text-amber-900/70" />
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
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
