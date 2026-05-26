import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import logo from "@/assets/lotto-runners-logo.png";
import {
  clearPendingAuth,
  getPendingAuthRole,
  setAuthSession,
} from "@/lib/auth-session";
import { isLocalDevAuthAllowed } from "@/lib/supabase/config";
import {
  getRoleHomePath,
  setCustomerOnboarded,
} from "@/lib/store";

export const Route = createFileRoute("/auth/verify")({
  beforeLoad: () => {
    throw redirect({ to: "/customer/verify" });
  },
});

export function CustomerVerifyPage() {
  const nav = useNavigate();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [seconds, setSeconds] = useState(54);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const loginRole = getPendingAuthRole() ?? "customer";

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const setAt = (i: number, v: string) => {
    const c = v.replace(/\D/g, "").slice(0, 1);
    const next = [...digits];
    next[i] = c;
    setDigits(next);
    if (c && i < 5) inputs.current[i + 1]?.focus();
  };

  const code = digits.join("");
  const valid = code.length === 6;

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background px-6 py-10">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
        <img src={logo} alt="Lotto Runners" className="h-14 w-14 object-contain" />
      </div>

      <h1 className="mt-6 text-center text-3xl font-black tracking-tight">Verify your account</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        We&apos;ve sent a 6-digit code to{" "}
        <span className="font-semibold text-foreground">+264 81 ••• ••••</span>
      </p>

      <div className="mt-8 w-full max-w-sm rounded-3xl border border-border bg-card p-5">
        <div className="flex justify-between gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              value={d}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
              }}
              inputMode="numeric"
              maxLength={1}
              className="h-14 w-12 rounded-xl border-2 border-border bg-background text-center text-2xl font-bold focus:border-primary focus:outline-none"
            />
          ))}
        </div>

        <button
          disabled={!valid}
          onClick={() => {
            if (!isLocalDevAuthAllowed()) return;
            setAuthSession(loginRole);
            clearPendingAuth();
            nav({ to: getRoleHomePath(loginRole === "admin" ? "customer" : loginRole) });
          }}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground transition-opacity disabled:opacity-50"
        >
          Verify
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </button>

        <div className="my-5 h-px bg-border" />
        <p className="text-center text-sm">
          Didn't receive the code? <button onClick={() => setSeconds(54)} className="font-bold text-primary">Resend Code</button>
        </p>
        <p className="mt-1 flex items-center justify-center gap-1 text-center text-sm text-muted-foreground">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Resend in 00:{seconds.toString().padStart(2, "0")}
        </p>
      </div>

      {loginRole === "customer" ? (
        <button
          onClick={() => {
            if (!isLocalDevAuthAllowed()) return;
            clearPendingAuth();
            setAuthSession("customer");
            setCustomerOnboarded(true);
            nav({ to: "/customer/home" });
          }}
          className="mt-6 text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Continue as guest →
        </button>
      ) : null}
    </div>
  );
}
