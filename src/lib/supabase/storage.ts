import { getSupabaseClient } from "./client";
import { getSupabaseUrl, isSupabaseConfigured } from "./config";

const UPLOAD_BUCKET = "uploads";

export function isUploadBucketMissingError(message: string): boolean {
  return /bucket not found|not set up/i.test(message);
}

function storageSetupErrorMessage(): string {
  let host = "your Supabase project";
  try {
    const url = getSupabaseUrl();
    if (url) host = new URL(url).hostname;
  } catch {
    /* ignore */
  }
  return `Storage bucket "uploads" is missing on ${host}. In Lovable Cloud → SQL, run the migration supabase/migrations/20260519160000_storage_uploads_bucket.sql (or create a public bucket named "uploads" in Storage).`;
}

export type UploadResult =
  | { ok: true; path: string; publicUrl: string }
  | { ok: false; error: string };

export async function uploadUserFile(
  file: File,
  folder: string,
): Promise<UploadResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Cloud storage is not configured. Connect Lovable Cloud or set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, error: "Could not connect to storage." };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { ok: false, error: "Sign in required to upload files." };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${authData.user.id}/${folder}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from(UPLOAD_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });

  if (uploadError) {
    const message = uploadError.message;
    if (isUploadBucketMissingError(message)) {
      return { ok: false, error: storageSetupErrorMessage() };
    }
    return { ok: false, error: message };
  }

  const { data: urlData } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(path);
  return { ok: true, path, publicUrl: urlData.publicUrl };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}
