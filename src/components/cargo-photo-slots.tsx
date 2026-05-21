import { Camera, Loader2, X } from "lucide-react";
import { useRef } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { CARGO_PHOTO_SLOTS, type CargoPhotoSlotId, type CargoPhotoUrls } from "@/lib/cargo-photos";
import { cn } from "@/lib/utils";

function CargoPhotoSlotTile({
  slotId,
  label,
  url,
  onUploaded,
  onClear,
}: {
  slotId: CargoPhotoSlotId;
  label: string;
  url: string | undefined;
  onUploaded: (publicUrl: string) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, error, previewUrl, remoteUrl, setError } = useFileUpload(`customer/cargo-photos/${slotId}`);
  const displayUrl = url ?? remoteUrl ?? previewUrl;

  const pickFile = () => {
    setError(null);
    inputRef.current?.click();
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (!file.type.startsWith("image/")) {
            setError("Please choose an image file.");
            return;
          }
          if (file.size > 8 * 1024 * 1024) {
            setError("Image must be under 8 MB.");
            return;
          }
          void upload(file).then((result) => {
            if (result.ok) onUploaded(result.publicUrl);
          });
        }}
      />
      <button
        type="button"
        onClick={pickFile}
        disabled={uploading}
        className={cn(
          "relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 transition",
          displayUrl ? "border-primary/40 bg-card" : "border-dashed border-border bg-secondary/40 hover:bg-secondary/70",
          uploading && "opacity-70",
        )}
      >
        {displayUrl ? (
          <img src={displayUrl} alt={label} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            {uploading ? (
              <Loader2 className="mb-1 h-5 w-5 animate-spin text-primary" aria-hidden />
            ) : (
              <Camera className="mb-1 h-5 w-5 text-muted-foreground" aria-hidden />
            )}
            <span className="relative z-10 px-1 text-center text-xs font-medium text-muted-foreground">{label}</span>
          </>
        )}
        {displayUrl && !uploading ? (
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1 py-1.5 text-center text-[10px] font-medium text-white">
            {label}
          </span>
        ) : null}
      </button>
      {displayUrl && !uploading ? (
        <button
          type="button"
          aria-label={`Remove ${label} photo`}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-destructive/10"
        >
          <X className="h-3.5 w-3.5 text-destructive" aria-hidden />
        </button>
      ) : null}
      {error ? <p className="mt-1 text-[10px] leading-snug text-destructive">{error}</p> : null}
    </div>
  );
}

export function CargoPhotoSlots({
  photos,
  onChange,
  className,
}: {
  photos: CargoPhotoUrls;
  onChange: (slot: CargoPhotoSlotId, url: string | null) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-3", className)}>
      {CARGO_PHOTO_SLOTS.map(({ id, label }) => (
        <CargoPhotoSlotTile
          key={id}
          slotId={id}
          label={label}
          url={photos[id]}
          onUploaded={(publicUrl) => onChange(id, publicUrl)}
          onClear={() => onChange(id, null)}
        />
      ))}
    </div>
  );
}
