"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth/session";
import { createStaffClient } from "@/lib/db/admin";
import { getSignedDocumentUrl } from "@/lib/documents/signed-url";

const DOC_TYPES = [
  "ticket",
  "hotel_voucher",
  "visa",
  "insurance",
  "passport",
  "pan",
  "itinerary",
  "quote",
  "receipt",
  "other",
] as const;

const OWNER_TYPES = [
  "lead",
  "trip",
  "service",
  "customer",
  "quotation",
  "payment",
] as const;

const MAX_BYTES = 25 * 1024 * 1024;

const uploadSchema = z.object({
  owner_type: z.enum(OWNER_TYPES),
  owner_id: z.string().uuid(),
  doc_type: z.enum(DOC_TYPES),
  customer_visible: z.coerce.boolean().default(false),
});

export type UploadState = { error?: string; ok?: boolean };

export async function uploadDocument(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const staff = await requireStaff();

  const parsed = uploadSchema.safeParse({
    owner_type: formData.get("owner_type"),
    owner_id: formData.get("owner_id"),
    doc_type: formData.get("doc_type"),
    customer_visible: formData.get("customer_visible") === "on",
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "That file is larger than 25 MB." };
  }

  const { owner_type, owner_id, doc_type, customer_visible } = parsed.data;

  // A random path segment, not the original filename: two people uploading
  // "passport.pdf" must not collide, and the storage path should not leak the
  // customer name to anyone who sees a URL.
  const extension = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
    : "";
  const storagePath = `${owner_type}/${owner_id}/${randomUUID()}${extension}`;

  const supabase = await createStaffClient();

  const { error: uploadError } = await supabase.storage
    .from("trip-documents")
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) return { error: uploadError.message };

  const { error } = await supabase.from("documents").insert({
    bucket: "trip-documents",
    storage_path: storagePath,
    filename: file.name,
    mime_type: file.type || null,
    size_bytes: file.size,
    doc_type,
    owner_type,
    owner_id,
    customer_visible,
    uploaded_by: staff.id,
  });

  if (error) {
    // Do not leave an orphaned object behind if the row could not be written.
    await supabase.storage.from("trip-documents").remove([storagePath]);
    return { error: error.message };
  }

  revalidatePath(`/leads/${owner_id}`);
  return { ok: true };
}

/** Returns a short-lived signed URL. Every call is written to the access log. */
export async function requestDocumentUrl(documentId: string): Promise<string> {
  const staff = await requireStaff();
  const signed = await getSignedDocumentUrl(documentId, {
    type: "staff",
    id: staff.id,
  });
  if (!signed) throw new Error("That document is no longer available.");
  return signed.url;
}

export async function deleteDocument(documentId: string) {
  await requireStaff();
  const supabase = await createStaffClient();

  const { data: document } = await supabase
    .from("documents")
    .select("id, bucket, storage_path, owner_id")
    .eq("id", documentId)
    .maybeSingle();

  if (!document) return;

  await supabase.storage.from(document.bucket).remove([document.storage_path]);
  await supabase.from("documents").delete().eq("id", documentId);

  revalidatePath(`/leads/${document.owner_id}`);
}
