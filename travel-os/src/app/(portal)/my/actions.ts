"use server";

import { revalidatePath } from "next/cache";

import { requireCustomer } from "@/lib/auth/portal-session";
import { registerCrossSellInterest } from "@/lib/cross-sell/register-interest";
import { getSignedDocumentUrl } from "@/lib/documents/signed-url";

/**
 * Portal server actions.
 *
 * Both of these re-establish who the caller is with `requireCustomer()` rather
 * than accepting a customer id as an argument. A Server Action is a public HTTP
 * endpoint — anything passed in is attacker-controlled, and a `customerId`
 * parameter here would be a straightforward account-takeover.
 */

export type InterestState = { ok?: boolean; error?: string };

export async function expressInterest(
  _prev: InterestState,
  formData: FormData,
): Promise<InterestState> {
  const customer = await requireCustomer();

  const suggestionId = String(formData.get("suggestion_id") ?? "");
  if (!suggestionId) return { error: "Missing suggestion." };

  const ok = await registerCrossSellInterest(suggestionId, customer.id);
  if (!ok) {
    return { error: "We could not record that just now. Please try again." };
  }

  revalidatePath("/my");
  return { ok: true };
}

export type DownloadState = { url?: string; filename?: string; error?: string };

/**
 * Hands back a short-lived signed URL rather than streaming the file.
 *
 * The URL is minted by the single chokepoint, which writes the access log
 * before returning and — since these files hold passports and PAN cards —
 * verifies that this customer is actually entitled to this document.
 */
export async function requestDocument(
  _prev: DownloadState,
  formData: FormData,
): Promise<DownloadState> {
  const customer = await requireCustomer();

  const documentId = String(formData.get("document_id") ?? "");
  if (!documentId) return { error: "Missing document." };

  const signed = await getSignedDocumentUrl(documentId, {
    type: "customer",
    id: customer.id,
  });

  // Deliberately the same message whether the document is missing or simply not
  // theirs. Telling them apart would confirm which ids exist.
  if (!signed) return { error: "That document is not available." };

  return { url: signed.url, filename: signed.filename };
}
