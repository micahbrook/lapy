"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, CheckCircle, XCircle, Download, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuoteActionsProps {
  quote: any;
}

export function QuoteActions({ quote }: QuoteActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);

  async function updateStatus(status: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Quote marked as ${status.toLowerCase()}`);
      router.refresh();
    } catch {
      toast.error("Failed to update quote");
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/pdf`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quote.quoteNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      router.refresh();
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  }

  async function sendQuote() {
    if (!quote.customer?.email) {
      toast.error("Customer has no email address");
      return;
    }
    setSendLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/send`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success(`Quote sent to ${quote.customer.email}`);
      router.refresh();
    } catch {
      toast.error("Failed to send quote");
    } finally {
      setSendLoading(false);
    }
  }

  const isDraft = quote.status === "DRAFT";
  const isSent = quote.status === "SENT";

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={downloadPdf}
        disabled={pdfLoading}
      >
        {pdfLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {quote.pdfUrl ? "Regenerate PDF" : "Download PDF"}
      </Button>

      {(isDraft || isSent) && quote.customer?.email && (
        <Button
          variant="outline"
          onClick={sendQuote}
          disabled={sendLoading}
        >
          {sendLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Mail className="w-4 h-4 mr-2" />
          )}
          {quote.sentAt ? "Resend Quote" : "Send Quote"}
        </Button>
      )}

      {isDraft && (
        <Button onClick={() => updateStatus("SENT")} disabled={loading}>
          <Send className="w-4 h-4 mr-2" />
          Mark as Sent
        </Button>
      )}
      {isSent && (
        <>
          <Button onClick={() => updateStatus("ACCEPTED")} disabled={loading}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark Accepted
          </Button>
          <Button
            variant="outline"
            onClick={() => updateStatus("DECLINED")}
            disabled={loading}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Mark Declined
          </Button>
        </>
      )}
    </div>
  );
}
