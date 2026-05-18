import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { CustomerHeaderLogo } from "@/components/customer-header-logo";
import { CustomerStickyHeader, type CustomerShellWidth } from "@/components/customer-page-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CustomerFlowHeaderProps = {
  title: string;
  onBack: () => void;
  width?: CustomerShellWidth;
  trailing?: ReactNode;
  backLabel?: string;
  className?: string;
};

export function CustomerFlowHeader({
  title,
  onBack,
  width = "md",
  trailing,
  backLabel = "Go back",
  className,
}: CustomerFlowHeaderProps) {
  return (
    <CustomerStickyHeader width={width} className={cn("bg-card/95", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 rounded-full"
        onClick={onBack}
        aria-label={backLabel}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h1 className="min-w-0 flex-1 truncate px-2 text-center text-base font-black tracking-tight text-primary sm:text-lg">
        {title}
      </h1>
      <div className="flex w-10 shrink-0 items-center justify-end">{trailing ?? <CustomerHeaderLogo size="sm" />}</div>
    </CustomerStickyHeader>
  );
}
