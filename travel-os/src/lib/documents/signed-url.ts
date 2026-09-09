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

export async function getSignedDocumentUrl(
  documentId: string,
  actor: { type: "staff" | "customer"; id: string },
): Promise<SignedDocument | null> {
  const supabase = await createStaffClient();

  const { data: document } = await supabase
    .from("documents")
    .select("id, bucket, storage_path, filename")
    .eq("id", documentId)
    .maybeSingle();

  if (!document) return null;

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
