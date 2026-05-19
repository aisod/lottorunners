import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FileSpreadsheet, Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BusinessRequestStepper, PortalPageIntro, PortalSection } from "@/components/portal-primitives";
import { parseBusinessBulkCsv, saveBusinessBulkDraft } from "@/lib/business-bulk-draft";

export const Route = createFileRoute("/business/bulk-import")({
  component: BusinessBulkImportPage,
});

function BusinessBulkImportPage() {
  const navigate = useNavigate();
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goReview = () => {
    setError(null);
    if (!fileText?.trim()) {
      setError("Choose a CSV file with an address column before continuing.");
      return;
    }

    const stops = parseBusinessBulkCsv(fileText);
    if (stops.length === 0) {
      setError("No valid addresses found. Use columns: address, notes (optional).");
      return;
    }

    saveBusinessBulkDraft({
      batchName: fileName ? `Import: ${fileName}` : "Imported batch",
      pickupAddress: "",
      serviceType: "delivery",
      stops,
      fromImport: true,
    });

    navigate({ to: "/business/bulk-review" });
  };

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Bulk logistics"
        title="Bulk import"
        description="Upload a CSV with addresses. Pickup origin is set on the review step or bulk request page."
      />

      <BusinessRequestStepper current="bulk-import" />

      <PortalSection title="Spreadsheet upload" description="Expected columns: address, notes (optional).">
        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-border bg-secondary/20 px-6 py-12 text-center transition hover:bg-secondary/35">
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setFileName(f?.name ?? null);
                if (!f) {
                  setFileText(null);
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  setFileText(typeof reader.result === "string" ? reader.result : "");
                };
                reader.readAsText(f);
              }}
            />
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Upload className="h-6 w-6" />
            </div>
            <span className="mt-4 text-sm font-semibold text-primary">{fileName ?? "Tap to choose CSV file"}</span>
            <span className="mt-1 text-xs text-muted-foreground">CSV · max 500 rows</span>
          </label>
          <div className="rounded-2xl border border-border bg-secondary/10 p-4 text-sm text-muted-foreground">
            Example row: <code className="text-foreground">Independence Ave Windhoek,Reception desk</code>
          </div>
        </div>
      </PortalSection>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <PortalSection title="Import actions" description="Move back to manual entry or continue to review.">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" asChild>
            <Link to="/business/bulk-request">Back to manual entry</Link>
          </Button>
          <Button type="button" onClick={goReview} disabled={!fileText} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Parse &amp; review
          </Button>
        </div>
      </PortalSection>
    </div>
  );
}
