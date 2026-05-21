import { useEffect, useState } from "react";
import { getAuthSession } from "@/lib/auth-session";
import { getSupabaseUserId } from "@/lib/auth-users";
import { readLocalRunnerDocuments, writeLocalRunnerDocuments } from "@/lib/runner-documents";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchRemoteDocuments } from "@/lib/supabase/profiles-remote";

function readLocalPhoto(email: string): string | null {
  return readLocalRunnerDocuments(email).profilePhoto ?? null;
}

/** Profile photo from onboarding documents (localStorage + Supabase profiles.documents). */
export function useRunnerProfilePhoto(): string | null {
  const session = getAuthSession();
  const email = session?.email ?? null;

  const [photoUrl, setPhotoUrl] = useState<string | null>(() => (email ? readLocalPhoto(email) : null));

  useEffect(() => {
    if (!email) {
      setPhotoUrl(null);
      return;
    }

    let cancelled = false;
    setPhotoUrl(readLocalPhoto(email));

    async function hydrate() {
      if (!isSupabaseConfigured()) return;

      const userId = await getSupabaseUserId();
      if (!userId || cancelled) return;

      const remote = await fetchRemoteDocuments(userId);
      if (cancelled) return;

      const remotePhoto = remote.profilePhoto?.trim();
      if (!remotePhoto) return;

      const localPhoto = readLocalPhoto(email);
      if (remotePhoto !== localPhoto) {
        writeLocalRunnerDocuments(email, { profilePhoto: remotePhoto });
      }
      setPhotoUrl(remotePhoto);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [email]);

  return photoUrl;
}
