import "server-only";

import { headers } from "next/headers";

import { createStaffClient } from "@/lib/db/admin";

/**
 * The one place a signed URL is ever minted.
 *
 * These files carry passports and PAN cards. Under the DPDP Act we have to be
 * able to evidence who accessed them, and that is only possible if there is a
 * single path — so `createSignedUrl` appears in this file and nowhere else, and
 * `npm run check` fails the build if it appears anywhere else.
 *
 * The access log is written BEFORE the URL is returned. Logging afterwards
 * would mean a crash between the two leaves a downloadable URL with no record
 * of it existing.
 */

/** Short by design: long enough to click, too short to forward usefully. */
const SIGNED_URL_TTL_SECONDS = 60;

export type SignedDocument = {
  url: string;
  filename: string;
};

type DocumentRow = {
  customer_visible: boolean;
  owner_type: string;
  owner_id: string;
};

/**
 * May this customer read this document?
 *
 * Two conditions, both required:
 *
 *   1. `customer_visible` is true. Staff decide what a traveller sees; internal
 *      paperwork stays internal even when it hangs off their own trip.
 *   2. The document's owner resolves to this customer — either the customer
 *      record itself, or a trip they are a traveller on.
 *
 * Trip membership, never household: a co-traveller invited to one trip must not
 * inherit sight of the booker's other travel. `trip_travellers` is the
 * authority on that, which is why it is queried rather than `households`.
 *
 * Anything else — quotations, leads, payments, services — returns false. Those
 * owner types exist for internal attachments; if a customer ever needs one, it
 * gets an explicit rule here rather than falling through a default.
 */
async function customerMayRead(
  supabase: Awaited<ReturnType<typeof createStaffClient>>,
  document: DocumentRow,
  customerId: string,
): Promise<boolean> {
  if (!document.customer_visible) return false;

  if (document.owner_type === "customer") {
    return document.owner_id === customerId;
  }

  if (document.owner_type === "trip") {
    const { data } = await supabase
      .from("trip_travellers")
      .select("id")
      .eq("trip_id", document.owner_id)
      .eq("customer_id", customerId)
      .maybeSingle();

    return data !== null;
  }

  return false;
}

export async function getSignedDocumentUrl(
  documentId: string,
  actor: { type: "staff" | "customer"; id: string },
): Promise<SignedDocument | null> {
  const supabase = await createStaffClient();

  const { data: document } = await supabase
    .from("documents")
    .select("id, bucket, storage_path, filename, customer_visible, owner_type, owner_id")
    .eq("id", documentId)
    .maybeSingle();

  if (!document) return null;

  /**
   * Entitlement.
   *
   * This client authenticates with the service role, so the lookup above
   * bypasses RLS entirely and will happily return ANY document — including
   * another traveller's passport. When the caller is a customer, `documentId`
   * came from a URL they control, so ownership has to be proved here. Without
   * this block the function is an IDOR: change the id, get someone else's PAN
   * card.
   *
   * Staff are not checked: they are already authorised for the whole agency,
   * and every access is logged below either way.
   */
  if (actor.type === "customer") {
    const entitled = await customerMayRead(supabase, document, actor.id);
    if (!entitled) return null;
  }

  const headerList = await headers();

  // Logged first, deliberately. See the note above.
  await supabase.from("document_access_log").insert({
    document_id: document.id,
    actor_type: actor.type,
    actor_id: actor.id,
    ip_address:
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: headerList.get("user-agent"),
  });

  const { data: signed, error } = await supabase.storage
    .from(document.bucket)
    .createSignedUrl(document.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: document.filename,
    });

  if (error || !signed) return null;

  return { url: signed.signedUrl, filename: document.filename };
}
