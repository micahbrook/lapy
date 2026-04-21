"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Send,
  CheckCircle,
  MessageSquare,
  AlertCircle,
  Download,
  Loader2,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { daysOverdue, formatDate } from "@/lib/utils";

interface InvoiceActionsProps {
  invoice: any;
}

interface ChaseVariant {
  tone: string;
  subject: string;
  sms: string;
  email: string;
}

export function InvoiceActions({ invoice }: InvoiceActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [chaseOpen, setChaseOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [paidRef, setPaidRef] = useState("");
  const [chaseLoading, setChaseLoading] = useState(false);
  const [chaseVariants, setChaseVariants] = useState<ChaseVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [customMessage, setCustomMessage] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);

  const reminders = (invoice.remindersSent as any[]) ?? [];
  const overdueDays = invoice.dueDate ? daysOverdue(invoice.dueDate) : 0;

  async function updateStatus(status: string, extra?: Record<string, any>) {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Invoice marked as ${status.toLowerCase()}`);
      router.refresh();
    } catch {
      toast.error("Failed to update invoice");
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/pdf`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      router.refresh();
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  }

  async function sendInvoice() {
    if (!invoice.job?.customer?.email) {
      toast.error("Customer has no email address");
      return;
    }
    setSendLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success(`Invoice sent to ${invoice.job.customer.email}`);
      router.refresh();
    } catch {
      toast.error("Failed to send invoice");
    } finally {
      setSendLoading(false);
    }
  }

  async function generateChaseMessages() {
    setChaseLoading(true);
    setChaseVariants([]);
    try {
      const res = await fetch("/api/ai/chase-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: invoice.invoiceNumber,
          amount: Number(invoice.total),
          daysOverdue: overdueDays,
          customerName: invoice.job?.customer?.name ?? "Customer",
          paymentLink: invoice.publicToken
            ? `${window.location.origin}/invoice/${invoice.publicToken}`
            : undefined,
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error();

      let raw = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
      }

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.messages?.length) {
          setChaseVariants(data.messages);
          setCustomMessage(data.messages[0].email);
          setSelectedVariant(0);
        }
      }
    } catch {
      toast.error("Failed to generate messages");
    } finally {
      setChaseLoading(false);
    }
  }

  async function sendReminderEmail() {
    setSendingReminder(true);
    try {
      const variant = chaseVariants[selectedVariant];
      const toneMap: Record<string, string> = {
        "Friendly Reminder": "friendly",
        "Firm Follow-up": "firm",
        "Final Notice": "final",
      };
      const tone = toneMap[variant?.tone] ?? "friendly";

      const res = await fetch(`/api/invoices/${invoice.id}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone, message: customMessage }),
      });
      if (!res.ok) throw new Error();
      toast.success("Reminder sent!");
      setChaseOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to send reminder");
    } finally {
      setSendingReminder(false);
    }
  }

  async function sendSms() {
    const phone = invoice.job?.customer?.phone;
    if (!phone) {
      toast.error("Customer has no phone number");
      return;
    }
    setSendingSms(true);
    try {
      const variant = chaseVariants[selectedVariant];
      const smsText = variant?.sms ?? customMessage.slice(0, 160);

      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, message: smsText }),
      });
      if (!res.ok) throw new Error();
      toast.success("SMS sent!");
    } catch {
      toast.error("Failed to send SMS");
    } finally {
      setSendingSms(false);
    }
  }

  const isDraft = invoice.status === "DRAFT";
  const isSent = invoice.status === "SENT";
  const isOverdue = invoice.status === "OVERDUE";
  const isPaid = invoice.status === "PAID";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={downloadPdf} disabled={pdfLoading}>
          {pdfLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {invoice.pdfUrl ? "Regenerate PDF" : "Download PDF"}
        </Button>

        {!isPaid && invoice.job?.customer?.email && (
          <Button variant="outline" onClick={sendInvoice} disabled={sendLoading}>
            {sendLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            {isSent || isOverdue ? "Resend Invoice" : "Send Invoice"}
          </Button>
        )}

        {isDraft && (
          <Button onClick={() => updateStatus("SENT")} disabled={loading}>
            <Send className="w-4 h-4 mr-2" />
            Mark as Sent
          </Button>
        )}

        {(isSent || isOverdue) && (
          <>
            <Button
              variant="outline"
              onClick={() => {
                setChaseVariants([]);
                setCustomMessage("");
                setChaseOpen(true);
              }}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chase Payment
            </Button>
            <Button onClick={() => setMarkPaidOpen(true)} disabled={loading}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Paid
            </Button>
          </>
        )}

        {isSent && (
          <Button variant="outline" onClick={() => updateStatus("OVERDUE")} disabled={loading}>
            <AlertCircle className="w-4 h-4 mr-2" />
            Mark Overdue
          </Button>
        )}

        {isPaid && (
          <p className="text-sm text-green-600 font-medium flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            Paid
            {invoice.paidReference ? ` · Ref: ${invoice.paidReference}` : ""}
          </p>
        )}
      </div>

      {/* Mark Paid Dialog */}
      <Dialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="paidRef">Payment Reference (optional)</Label>
              <Input
                id="paidRef"
                value={paidRef}
                onChange={(e) => setPaidRef(e.target.value)}
                placeholder="e.g. BSB transfer ref, cheque number"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setMarkPaidOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  await updateStatus("PAID", { paidReference: paidRef || undefined });
                  setMarkPaidOpen(false);
                }}
                disabled={loading}
              >
                Confirm Paid
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chase Payment Dialog */}
      <Dialog open={chaseOpen} onOpenChange={setChaseOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chase Payment — {invoice.invoiceNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Reminder history */}
            {reminders.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase">Reminder History</p>
                {reminders.map((r: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Badge
                      variant="outline"
                      className={
                        r.tone === "final"
                          ? "border-red-300 text-red-700"
                          : r.tone === "firm"
                          ? "border-yellow-300 text-yellow-700"
                          : "border-blue-300 text-blue-700"
                      }
                    >
                      {r.tone}
                    </Badge>
                    <span className="text-gray-500">{formatDate(r.sentAt)}</span>
                    {r.auto && (
                      <span className="text-xs text-gray-400">(auto)</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Generate button */}
            <Button
              onClick={generateChaseMessages}
              disabled={chaseLoading}
              variant="outline"
              className="w-full"
            >
              {chaseLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating 3 variants…
                </>
              ) : (
                "Generate Messages with AI"
              )}
            </Button>

            {/* Variant tabs */}
            {chaseVariants.length > 0 && (
              <>
                <div className="flex gap-2">
                  {chaseVariants.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedVariant(i);
                        setCustomMessage(v.email);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedVariant === i
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {v.tone}
                    </button>
                  ))}
                </div>

                {/* SMS preview */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-600 uppercase mb-1">SMS Preview</p>
                  <p className="text-sm text-gray-700">{chaseVariants[selectedVariant]?.sms}</p>
                </div>

                {/* Email body editor */}
                <div>
                  <Label>Email Body</Label>
                  <Textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="mt-1 min-h-[180px]"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={sendReminderEmail}
                    disabled={sendingReminder || !invoice.job?.customer?.email}
                    className="flex-1"
                  >
                    {sendingReminder ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    Send Email
                  </Button>
                  <Button
                    variant="outline"
                    onClick={sendSms}
                    disabled={sendingSms || !invoice.job?.customer?.phone}
                    title={!invoice.job?.customer?.phone ? "Customer has no phone number" : undefined}
                  >
                    {sendingSms ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Phone className="w-4 h-4 mr-2" />
                    )}
                    Send SMS
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(customMessage);
                      toast.success("Copied to clipboard");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
