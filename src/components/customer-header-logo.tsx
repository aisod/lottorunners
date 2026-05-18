import { Link } from "@tanstack/react-router";
import logo from "@/assets/lotto-runners-logo.png";
import { cn } from "@/lib/utils";

type CustomerHeaderLogoProps = {
  size?: "sm" | "md";
  className?: string;
};

export function CustomerHeaderLogo({ size = "md", className }: CustomerHeaderLogoProps) {
  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  return (
    <Link
      to="/customer/home"
      className={cn("flex shrink-0 items-center justify-center", className)}
      aria-label="Lotto Runners home"
    >
      <img src={logo} alt="" className={cn(dim, "object-contain")} />
    </Link>
  );
}

/** Centered logo for auth-style and bridge screens */
export function CustomerBrandMark({ className }: { className?: string }) {
  return (
    <img
      src={logo}
      alt="Lotto Runners"
      className={cn("mx-auto h-16 w-16 object-contain sm:h-20 sm:w-20", className)}
    />
  );
}
