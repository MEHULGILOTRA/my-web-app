"use client";

import { useActionState, useEffect } from "react";

import { requestDocument, type DownloadState } from "@/app/(portal)/my/actions";
import type { PortalDocument } from "@/lib/portal/trips";

const DOC_LABEL: Record<string, string> = {
  ticket: "Ticket",
  hotel_voucher: "Hotel voucher",
  visa: "Visa",
  insurance: "Insurance",
  itinerary: "Itinerary",
  receipt: "Receipt",
  passport: "Passport",
  pan: "PAN",
  quote: "Quotation",
  other: "Document",
};

export function DocumentList({ documents }: { documents: PortalDocument[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-brand-ink text-lg font-semibold">Documents</h2>

      {documents.length === 0 ? (
        <p className="text-brand-ink/60 mt-3 text-sm">
          Your tickets and vouchers will appear here as we issue them.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {documents.map((document) => (
            <DocumentRow key={document.id} document={document} />
          ))}
        </ul>
      )}

      <p className="text-brand-ink/50 mt-4 text-xs leading-relaxed">
        Documents are only available while you are signed in. Download links
        expire after a minute and cannot be shared.
      </p>
    </section>
  );
}

function DocumentRow({ document: doc }: { document: PortalDocument }) {
  const [state, formAction, pending] = useActionState<DownloadState, FormData>(
    requestDocument,
    {},
  );

  useEffect(() => {
    if (!state.url) return;

    /**
     * The signed URL lives for 60 seconds, so it is opened immediately rather
     * than rendered as a link a traveller might come back to and find dead.
     *
     * `noopener` matters: without it the opened tab gets a handle to this one
     * through window.opener.
     */
    window.open(state.url, "_blank", "noopener,noreferrer");
  }, [state.url]);

  return (
    <li className="border-brand-ink/10 flex items-center justify-between gap-4 rounded-xl border bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="text-brand-ink/50 text-[11px] tracking-wide uppercase">
          {DOC_LABEL[doc.doc_type] ?? doc.doc_type}
        </p>
        <p className="text-brand-ink truncate text-sm">{doc.filename}</p>
      </div>

      <form action={formAction}>
        <input type="hidden" name="document_id" value={doc.id} />
        <button
          type="submit"
          disabled={pending}
          className="border-brand-ink/20 shrink-0 rounded-full border px-3 py-1.5 text-sm disabled:opacity-60"
        >
          {pending ? "…" : "Download"}
        </button>
      </form>

      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
    </li>
  );
}
