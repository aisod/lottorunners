import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FileSpreadsheet, Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BusinessRequestStepper, PortalPageIntro, PortalSection } from "@/components/portal-primitives";
import { saveBusinessBulkDraft } from "@/lib/business-bulk-draft";

export const Route = createFileRoute("/business/bulk-import")({
  component: BusinessBulkImportPage,
});

function BusinessBulkImportPage() {
  const navigate = useNavigate();
  const [fileName, setFileName] = useState<string | null>(null);

  const goReview = () => {
    saveBusinessBulkDraft({
      batchName: fileName ? `Import: ${fileName}` : "Imported batch",
      stops: [
        { address: "Independence Ave — Stop A (imported)", notes: "Row 1" },
        { address: "Sam Nujoma Dr — Stop B (imported)", notes: "Row 2" },
        { address: "Eros — Stop C (imported)", notes: "Row 3" },
      ],
      fromImport: true,
    });

    navigate({
      to: "/business/bulk-review",
    });
  };

  return (
    <div className="space-y-6">
      <PortalPageIntro
        eyebrow="Bulk logistics"
        title="Bulk import"
        description="Upload a CSV or Excel template with addresses and optional notes. No file leaves the browser in this prototype."
      />

      <BusinessRequestStepper current="bulk-import" />

      <PortalSection title="Spreadsheet upload" description="Expected columns: address, notes, priority (optional).">
        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-border bg-secondary/20 px-6 py-12 text-center transition hover:bg-secondary/35">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setFileName(f?.name ?? null);
              }}
            />
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Upload className="h-6 w-6" />
            </div>
            <span className="mt-4 text-sm font-semibold text-primary">{fileName ?? "Tap to choose file"}</span>
            <span className="mt-1 text-xs text-muted-foreground">CSV or Excel · max 500 rows (demo)</span>
          </label>
          <div className="rounded-2xl border border-border bg-secondary/10 p-4 text-sm text-muted-foreground">
            Without a file, review opens with sample imported rows so the flow remains easy to demo.
          </div>
        </div>
      </PortalSection>

      <PortalSection title="Import actions" description="Move back to manual entry or continue to review.">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" asChild>
            <Link to="/business/bulk-request">Back to manual entry</Link>
          </Button>
          <Button type="button" onClick={goReview} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Parse &amp; review
          </Button>
        </div>
      </PortalSection>
    </div>
  );
}
