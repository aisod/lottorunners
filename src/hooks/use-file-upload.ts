import { useCallback, useState } from "react";
import { readFileAsDataUrl, uploadUserFile } from "@/lib/supabase/storage";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function useFileUpload(folder: string) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        const localPreview = await readFileAsDataUrl(file);
        setPreviewUrl(localPreview);

        if (!isSupabaseConfigured()) {
          setRemoteUrl(localPreview);
          return { ok: true as const, publicUrl: localPreview };
        }

        const result = await uploadUserFile(file, folder);
        if (!result.ok) {
          setError(result.error);
          return result;
        }
        setRemoteUrl(result.publicUrl);
        return result;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Upload failed.";
        setError(message);
        return { ok: false as const, error: message };
      } finally {
        setUploading(false);
      }
    },
    [folder],
  );

  return { upload, uploading, error, previewUrl, remoteUrl, setError };
}
