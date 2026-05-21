import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Bell, Car, CheckCircle2, FileText, HelpCircle, UserRound } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { RunnerOnboardingProgress } from "@/components/runner-onboarding-progress";
import { RunnerProfileAvatar } from "@/components/runner-profile-avatar";
import { Button } from "@/components/ui/button";
import { getAuthSession } from "@/lib/auth-session";
import { getSupabaseUserId } from "@/lib/auth-users";
import { persistRunnerOnboardingStage } from "@/lib/runner-account";
import {
  readLocalRunnerDocuments,
  writeLocalRunnerDocuments,
  type RunnerDocumentKey,
  type RunnerDocumentUrls,
} from "@/lib/runner-documents";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mergeRemoteDocuments } from "@/lib/supabase/profiles-remote";
import { isUploadBucketMissingError, readFileAsDataUrl, uploadUserFile } from "@/lib/supabase/storage";

export const Route = createFileRoute("/runner/onboarding/documents")({
  component: RunnerOnboardingDocumentsPage,
});

function RunnerOnboardingDocumentsPage() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const idInputRef = useRef<HTMLInputElement | null>(null);
  const licenseInputRef = useRef<HTMLInputElement | null>(null);
  const insuranceInputRef = useRef<HTMLInputElement | null>(null);

  const [urls, setUrls] = useState<RunnerDocumentUrls>({});
  const [uploadingKey, setUploadingKey] = useState<RunnerDocumentKey | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.email) return;
    setUrls(readLocalRunnerDocuments(session.email));
  }, [session?.email]);

  const triggerUpload = (key: RunnerDocumentKey) => {
    const map: Record<RunnerDocumentKey, React.RefObject<HTMLInputElement | null>> = {
      profilePhoto: profilePhotoInputRef,
      nationalId: idInputRef,
      license: licenseInputRef,
      insurance: insuranceInputRef,
    };
    map[key].current?.click();
  };

  const saveDocumentUrl = async (key: RunnerDocumentKey, publicUrl: string) => {
    if (!session?.email) return;

    const next = writeLocalRunnerDocuments(session.email, { [key]: publicUrl });
    setUrls(next);

    const userId = await getSupabaseUserId();
    if (userId) {
      await mergeRemoteDocuments(userId, { [key]: publicUrl });
    }
  };

  const onFilePicked = async (key: RunnerDocumentKey, file: File | undefined) => {
    if (!file || !session?.email) return;

    setUploadError(null);
    setUploadingKey(key);

    try {
      let publicUrl: string;

      if (isSupabaseConfigured()) {
        const result = await uploadUserFile(file, `runner-documents/${key}`);
        if (!result.ok) {
          if (isUploadBucketMissingError(result.error)) {
            publicUrl = await readFileAsDataUrl(file);
            const next = writeLocalRunnerDocuments(session.email, { [key]: publicUrl });
            setUrls(next);
            setUploadError(
              `${result.error} Document is saved on this device only until the uploads bucket exists.`,
            );
            return;
          }
          setUploadError(result.error);
          return;
        }
        publicUrl = result.publicUrl;
      } else {
        publicUrl = await readFileAsDataUrl(file);
      }

      await saveDocumentUrl(key, publicUrl);
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setUploadingKey(null);
    }
  };

  const uploaded = {
    profilePhoto: Boolean(urls.profilePhoto),
    nationalId: Boolean(urls.nationalId),
    license: Boolean(urls.license),
    insurance: Boolean(urls.insurance),
  };

  const canSubmit =
    uploaded.profilePhoto && uploaded.nationalId && uploaded.license && uploaded.insurance;

  return (
    <div className="min-h-dvh bg-background pb-36">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background px-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/runner/service-selection" })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-primary">Runner setup</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label="Notifications"
            disabled
            title="Notifications are not available yet"
          >
            <Bell className="h-5 w-5 opacity-50" />
          </Button>
          <RunnerProfileAvatar size="sm" photoUrl={urls.profilePhoto} />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-5 py-6">
        <div>
          <h2 className="text-2xl font-bold">Identity &amp; documents</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your profile photo and supporting documents so the verification team can activate your runner account.
          </p>
        </div>

        <RunnerOnboardingProgress current="documents" />

        {uploadError ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {uploadError}
          </p>
        ) : null}

        <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 md:flex-row md:items-center">
          <div className="flex-1 space-y-3">
            <h3 className="font-semibold text-primary">Upload guide</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Use a clear profile photo with your face fully visible
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Ensure all four corners of each document are visible
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Avoid blur and glare on laminated cards
              </li>
            </ul>
          </div>
          <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border bg-secondary/40 md:w-64">
            {urls.profilePhoto ? (
              <img src={urls.profilePhoto} alt="Profile preview" className="h-full w-full object-cover" />
            ) : (
              <BadgeCheck className="h-14 w-14 text-muted-foreground/40" />
            )}
            <div className="absolute bottom-2 left-2 right-2 rounded-md border bg-background/90 px-2 py-1 text-center text-xs font-medium text-primary">
              {urls.profilePhoto ? "Profile photo uploaded" : "Sample photography view"}
            </div>
          </div>
        </section>

        <input
          ref={profilePhotoInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(event) => void onFilePicked("profilePhoto", event.target.files?.[0])}
        />
        <input
          ref={idInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => void onFilePicked("nationalId", event.target.files?.[0])}
        />
        <input
          ref={licenseInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => void onFilePicked("license", event.target.files?.[0])}
        />
        <input
          ref={insuranceInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void onFilePicked("insurance", event.target.files?.[0])}
        />

        <section className="space-y-3">
          <DocumentRow
            title="Profile Photo"
            subtitle="Shown on your runner profile and customer-facing job card"
            icon={<UserRound className="h-7 w-7" />}
            status={uploaded.profilePhoto ? "uploaded" : "required"}
            primaryLabel={uploadingKey === "profilePhoto" ? "Uploading…" : uploaded.profilePhoto ? "Replace" : "Upload"}
            previewUrl={urls.profilePhoto}
            disabled={uploadingKey !== null}
            onPrimary={() => triggerUpload("profilePhoto")}
          />
          <DocumentRow
            title="National ID"
            subtitle="Front and back required"
            icon={<BadgeCheck className="h-7 w-7" />}
            status={uploaded.nationalId ? "uploaded" : "required"}
            primaryLabel={uploadingKey === "nationalId" ? "Uploading…" : uploaded.nationalId ? "Replace" : "Upload"}
            previewUrl={urls.nationalId}
            disabled={uploadingKey !== null}
            onPrimary={() => triggerUpload("nationalId")}
          />
          <DocumentRow
            title="Driver's License"
            subtitle="Must be valid and current"
            icon={<Car className="h-7 w-7" />}
            status={uploaded.license ? "uploaded" : "required"}
            primaryLabel={uploadingKey === "license" ? "Uploading…" : uploaded.license ? "Replace" : "Upload"}
            previewUrl={urls.license}
            disabled={uploadingKey !== null}
            onPrimary={() => triggerUpload("license")}
          />
          <DocumentRow
            title="Vehicle Insurance"
            subtitle="Policy showing you as a covered driver"
            icon={<FileText className="h-7 w-7" />}
            status={uploaded.insurance ? "uploaded" : "required"}
            primaryLabel={uploadingKey === "insurance" ? "Uploading…" : uploaded.insurance ? "Replace" : "Upload"}
            previewUrl={urls.insurance}
            disabled={uploadingKey !== null}
            onPrimary={() => triggerUpload("insurance")}
          />
        </section>

        <button type="button" className="mx-auto flex items-center gap-2 text-sm font-semibold text-primary">
          <HelpCircle className="h-4 w-4" />
          Need help with document verification?
        </button>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-4xl">
          <Button
            className="h-12 w-full text-base"
            disabled={!canSubmit || uploadingKey !== null}
            onClick={() => {
              persistRunnerOnboardingStage("vehicle");
              navigate({ to: "/runner/onboarding/vehicle" });
            }}
          >
            Continue to vehicle details
          </Button>
        </div>
      </div>

    </div>
  );
}

function DocumentRow({
  title,
  subtitle,
  icon,
  status,
  primaryLabel,
  previewUrl,
  disabled,
  onPrimary,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  status: "required" | "uploaded";
  primaryLabel: string;
  previewUrl?: string;
  disabled?: boolean;
  onPrimary: () => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
          <div>
            <h4 className="font-semibold">{title}</h4>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
            {previewUrl ? (
              <img src={previewUrl} alt="" className="mt-2 max-h-24 rounded-lg border object-cover" />
            ) : null}
          </div>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          {status === "required" ? (
            <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">Required</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs font-semibold text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Uploaded
            </span>
          )}
          <Button
            type="button"
            variant={status === "uploaded" ? "outline" : "default"}
            className="flex-1 sm:flex-none"
            disabled={disabled}
            onClick={onPrimary}
          >
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
