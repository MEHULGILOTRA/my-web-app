"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Send, Split } from "lucide-react";
import { toast } from "sonner";

import {
  logWhatsAppCopy,
  reviseQuotation,
  sendQuotation,
} from "@/app/(admin)/quotations/actions";
import { Button } from "@/components/ui/button";

export function QuotationToolbar({
  quotationId,
  status,
  whatsappText,
}: {
  quotationId: string;
  status: string;
  whatsappText: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(whatsappText);
    } catch {
      // Clipboard API needs a secure context and permission; fall back to a
      // hidden textarea so this still works over plain http on a LAN.
      const area = document.createElement("textarea");
      area.value = whatsappText;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Quotation copied", {
      description: "Paste it into WhatsApp.",
    });
    void logWhatsAppCopy(quotationId);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" className="h-7 gap-1.5 text-[12px]" onClick={copy}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy for WhatsApp"}
      </Button>

      {status === "draft" ? (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-[12px]"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                await sendQuotation(quotationId);
                toast.success("Quotation frozen and marked sent");
                router.refresh();
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Could not send",
                );
              }
            })
          }
        >
          <Send className="size-3.5" />
          Mark as sent
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-[12px]"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                await reviseQuotation(quotationId);
              } catch (error) {
                // redirect() throws by design; only report real failures.
                if (
                  error instanceof Error &&
                  !error.message.includes("NEXT_REDIRECT")
                ) {
                  toast.error(error.message);
                }
              }
            })
          }
        >
          <Split className="size-3.5" />
          Create revision
        </Button>
      )}
    </div>
  );
}
