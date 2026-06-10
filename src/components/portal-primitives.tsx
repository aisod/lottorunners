import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export function PortalPageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
        ) : null}
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight text-primary sm:text-3xl">{title}</h2>
          {description ? <p className="max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
    </div>
  );
}

export function PortalStatTile({
  icon: Icon,
  label,
  value,
  meta,
  tone = "default",
  className,
}: {
  icon?: LucideIcon;
  label: string;
  value: string;
  meta?: string;
  tone?: "default" | "primary" | "danger";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-sm",
        tone === "primary" && "border-primary/15 bg-primary text-primary-foreground",
        tone === "danger" && "border-destructive/20 bg-destructive/10",
        tone === "default" && "border-border bg-card/90",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-[0.18em]",
              tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground",
              tone === "danger" && "text-destructive",
            )}
          >
            {label}
          </p>
          <p className={cn("truncate text-2xl font-black tracking-tight sm:text-3xl", tone === "danger" ? "text-destructive" : "")}>{value}</p>
          {meta ? (
            <p className={cn("text-xs", tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground")}>{meta}</p>
          ) : null}
        </div>
        {Icon ? (
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl",
              tone === "primary" && "bg-white/15 text-primary-foreground",
              tone === "danger" && "bg-destructive/15 text-destructive",
              tone === "default" && "bg-secondary text-primary",
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PortalSection({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card/90 shadow-sm", className)}>
      <div className="flex flex-col gap-3 border-b border-border/80 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="flex w-full flex-wrap gap-2 sm:w-auto">{action}</div> : null}
      </div>
      <div className={cn("px-5 py-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 truncate rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
        tone === "neutral" && "bg-secondary text-foreground",
        tone === "primary" && "bg-primary/10 text-primary",
        tone === "success" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
        tone === "warning" && "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
        tone === "danger" && "bg-destructive/15 text-destructive",
        className,
      )}
    >
      {children}
    </span>
  );
}

const REQUEST_STEPS = [
  { id: "bulk-request", label: "Service setup", detail: "Choose category" },
  { id: "bulk-import", label: "Import or entry", detail: "Stops & data" },
  { id: "bulk-review", label: "Review & submit", detail: "Dispatch batch" },
] as const;

export function BusinessRequestStepper({
  current,
}: {
  current: "bulk-request" | "bulk-import" | "bulk-review";
}) {
  const currentIndex = REQUEST_STEPS.findIndex((step) => step.id === current);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/90 p-5 shadow-sm lg:flex-row lg:items-center">
      {REQUEST_STEPS.map((step, index) => {
        const complete = index < currentIndex;
        const active = index === currentIndex;

        return (
          <div key={step.id} className="flex min-w-0 flex-1 items-center gap-4">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                active && "border-primary bg-primary text-primary-foreground",
                complete && "border-primary bg-primary/10 text-primary",
                !active && !complete && "border-border bg-secondary text-muted-foreground",
              )}
            >
              {complete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-semibold", active ? "text-primary" : "text-foreground")}>{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.detail}</p>
            </div>
            {index < REQUEST_STEPS.length - 1 ? (
              <div className="hidden h-px flex-1 bg-border lg:block" aria-hidden />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function StepListItem({
  title,
  subtitle,
  active = false,
  complete = false,
}: {
  title: string;
  subtitle: string;
  active?: boolean;
  complete?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="pt-0.5">
        {complete ? (
          <CheckCircle2 className="h-5 w-5 text-primary" />
        ) : (
          <Circle className={cn("h-5 w-5", active ? "fill-primary text-primary" : "text-muted-foreground")} />
        )}
      </div>
      <div className="space-y-1">
        <p className={cn("text-sm font-semibold", active ? "text-primary" : "text-foreground")}>{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
