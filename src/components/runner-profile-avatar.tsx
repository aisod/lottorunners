import { UserRound } from "lucide-react";
import { useRunnerProfilePhoto } from "@/lib/use-runner-profile-photo";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
  lg: "h-16 w-16",
} as const;

const iconClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
} as const;

type RunnerProfileAvatarProps = {
  /** Override hook (e.g. documents page right after upload). */
  photoUrl?: string | null;
  size?: keyof typeof sizeClasses;
  className?: string;
};

export function RunnerProfileAvatar({ photoUrl: override, size = "md", className }: RunnerProfileAvatarProps) {
  const fromHook = useRunnerProfilePhoto();
  const photoUrl = override ?? fromHook;
  const dim = sizeClasses[size];

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={cn(dim, "shrink-0 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        dim,
        "flex shrink-0 items-center justify-center rounded-full bg-secondary text-primary",
        className,
      )}
      aria-hidden
    >
      <UserRound className={iconClasses[size]} />
    </div>
  );
}
