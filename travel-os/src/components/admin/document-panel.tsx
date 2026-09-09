"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  deleteDocument,
  requestDocumentUrl,
  uploadDocument,
  type UploadState,
} from "@/app/(admin)/documents/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DocumentRow = {
  id: string;
  filename: string;
  doc_type: string;
  size_bytes: number | null;
  customer_visible: boolean;
  created_at: string;
};

const DOC_TYPES = [
  ["ticket", "Ticket"],
  ["hotel_voucher", "Hotel voucher"],
  ["visa", "Visa"],
  ["insurance", "Insurance"],
  ["passport", "Passport"],
  ["pan", "PAN card"],
  ["itinerary", "Itinerary"],
  ["quote", "Quotation"],
  ["receipt", "Receipt"],
  ["other", "Other"],
] as const;

const control = cn(
  "border-input bg-background h-7 w-full rounded-md border px-2 text-[12px]",
  "focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] focus-visible:outline-none",
);

function fileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentPanel({
  ownerType,
  ownerId,
  documents,
}: {
  ownerType: string;
  ownerId: string;
  documents: DocumentRow[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [state, formAction, uploading] = useActionState<UploadState, FormData>(
    uploadDocument,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("Document uploaded");
      // The form stays open and just resets: documents arrive in batches
      // (tickets, then vouchers, then the visa), so closing after each one
      // would mean reopening it every time. Also avoids a setState in an
      // effect, which triggers a cascading render.
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.ok, router]);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state.error]);

  function download(id: string) {
    startTransition(async () => {
      try {
        // The URL is minted server-side and logged before it is handed over.
        // It expires in a minute, so it is fetched on click rather than
        // embedded in the page.
        const url = await requestDocumentUrl(id);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not open document",
        );
      }
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          Documents
        </h2>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="text-primary text-[12px] underline underline-offset-2"
        >
          {open ? "Cancel" : "Upload"}
        </button>
      </div>

      {open ? (
        <form
          ref={formRef}
          action={formAction}
          className="bg-muted/40 mb-3 space-y-2 rounded-lg border p-2.5"
        >
          <input type="hidden" name="owner_type" value={ownerType} />
          <input type="hidden" name="owner_id" value={ownerId} />

          <input
            type="file"
            name="file"
            required
            className="text-[11px] file:mr-2 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-[11px]"
          />

          <select name="doc_type" defaultValue="other" className={control}>
            {DOC_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <label className="text-muted-foreground flex items-start gap-1.5 text-[11px]">
            <input
              type="checkbox"
              name="customer_visible"
              className="accent-primary mt-0.5 size-3"
            />
            <span>
              Show to the customer in their portal. Off by default — passports
              and PAN cards should stay internal.
            </span>
          </label>

          <Button
            type="submit"
            size="sm"
            disabled={uploading}
            className="h-7 w-full gap-1.5 text-[12px]"
          >
            <Upload className="size-3.5" />
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </form>
      ) : null}

      {documents.length === 0 ? (
        <p className="text-muted-foreground text-[13px]">No documents yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex items-center gap-2 rounded-md border px-2 py-1.5"
            >
              <FileText className="text-muted-foreground size-3.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium">
                  {document.filename}
                </p>
                <p className="text-muted-foreground text-[10px]">
                  {document.doc_type.replace("_", " ")}
                  {document.size_bytes ? ` · ${fileSize(document.size_bytes)}` : ""}
                  {document.customer_visible ? " · visible to customer" : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => download(document.id)}
                aria-label={`Download ${document.filename}`}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <Download className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    await deleteDocument(document.id);
                    toast.success("Document deleted");
                    router.refresh();
                  })
                }
                aria-label={`Delete ${document.filename}`}
                className="text-muted-foreground hover:text-destructive p-1"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
