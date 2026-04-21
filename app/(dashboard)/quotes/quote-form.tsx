"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import {
  Sparkles,
  Plus,
  Trash2,
  Save,
  Send,
  Mic,
  MicOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAUD, generateQuoteNumber, calculateGST } from "@/lib/utils";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  includeGst: boolean;
  total: number;
}

interface QuoteFormProps {
  user: any;
  customers: any[];
  quoteCount: number;
  prefillData?: any;
}

export function QuoteForm({ user, customers, quoteCount, prefillData }: QuoteFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const [form, setForm] = useState({
    customerId: prefillData?.customerId ?? "",
    jobDescription: prefillData?.description ?? "",
    notes: prefillData?.notes ?? user.defaultNotes ?? "",
    validUntil: format(addDays(new Date(), user.defaultQuoteValidity ?? 30), "yyyy-MM-dd"),
  });

  const [lineItems, setLineItems] = useState<LineItem[]>(
    prefillData?.lineItems ?? []
  );

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const gst = lineItems
    .filter((i) => i.includeGst)
    .reduce((sum, item) => sum + calculateGST(item.total), 0);
  const total = subtotal + gst;

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unit: "hr",
        unitPrice: 0,
        includeGst: true,
        total: 0,
      },
    ]);
  }

  function updateLineItem(id: string, field: keyof LineItem, value: any) {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        updated.total = updated.quantity * updated.unitPrice;
        return updated;
      })
    );
  }

  function removeLineItem(id: string) {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function generateWithAI() {
    if (!form.jobDescription) {
      toast.error("Enter a job description first");
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/voice-to-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: form.jobDescription,
          tradeType: user.tradeType,
          state: user.state,
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      let raw = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
      }

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Bad response");

      const data = JSON.parse(jsonMatch[0]);
      if (data.lineItems?.length) {
        setLineItems(
          data.lineItems.map((item: any) => ({
            id: crypto.randomUUID(),
            description: item.description ?? "",
            quantity: item.quantity ?? 1,
            unit: item.unit ?? "hr",
            unitPrice: item.unitPrice ?? 0,
            includeGst: item.includeGst ?? true,
            total: (item.quantity ?? 1) * (item.unitPrice ?? 0),
          }))
        );
        toast.success("Line items generated! Review and adjust as needed.");
      }
    } catch {
      toast.error("AI assist failed. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }

  function startVoice() {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Voice input not supported in this browser");
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-AU";

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
      setForm((f) => ({ ...f, jobDescription: f.jobDescription + " " + transcript }));
    };
    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
    setTimeout(() => { recognition.stop(); setListening(false); }, 30000);
  }

  async function saveQuote(sendNow = false) {
    if (!form.customerId) { toast.error("Please select a customer"); return; }
    if (lineItems.length === 0) { toast.error("Add at least one line item"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteNumber: generateQuoteNumber(quoteCount),
          customerId: form.customerId,
          lineItems,
          subtotal,
          gst,
          total,
          notes: form.notes,
          validUntil: form.validUntil,
          status: sendNow ? "SENT" : "DRAFT",
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      toast.success(sendNow ? "Quote sent!" : "Quote saved as draft");
      router.push(`/quotes/${data.id}`);
    } catch {
      toast.error("Failed to save quote");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Quote</h1>
          <p className="text-sm text-gray-500 mt-1">{generateQuoteNumber(quoteCount)}</p>
        </div>
      </div>

      {/* Customer */}
      <Card>
        <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Customer *</Label>
            <Select value={form.customerId} onValueChange={(v) => setForm((f) => ({ ...f, customerId: v }))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a customer..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.suburb ? `· ${c.suburb}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {customers.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">
                No customers yet. <a href="/customers/new" className="underline">Add a customer first.</a>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Job Description + AI */}
      <Card>
        <CardHeader><CardTitle className="text-base">Job Description</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Textarea
              value={form.jobDescription}
              onChange={(e) => setForm((f) => ({ ...f, jobDescription: e.target.value }))}
              placeholder="Describe the job (voice or type)..."
              className="min-h-[100px] pr-12"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={startVoice}
            >
              {listening ? (
                <MicOff className="w-4 h-4 text-red-500 animate-pulse" />
              ) : (
                <Mic className="w-4 h-4 text-gray-400" />
              )}
            </Button>
          </div>
          <Button
            onClick={generateWithAI}
            disabled={aiLoading || !form.jobDescription}
            variant="outline"
            className="w-full"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {aiLoading ? "Generating line items..." : "AI Assist — Generate Line Items"}
          </Button>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {/* Header - desktop only */}
          <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium uppercase px-1">
            <span className="col-span-5">Description</span>
            <span className="col-span-2">Qty</span>
            <span className="col-span-1">Unit</span>
            <span className="col-span-2">Unit Price</span>
            <span className="col-span-1">GST</span>
            <span className="col-span-1">Total</span>
          </div>

          {lineItems.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-12 sm:col-span-5">
                <Input
                  value={item.description}
                  onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                  placeholder="Description..."
                  className="text-sm"
                />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                  className="text-sm"
                  min="0"
                  step="0.5"
                />
              </div>
              <div className="col-span-3 sm:col-span-1">
                <Select value={item.unit} onValueChange={(v) => updateLineItem(item.id, "unit", v)}>
                  <SelectTrigger className="text-xs h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["hr", "ea", "m", "m2", "m3", "day", "lump"].map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4 sm:col-span-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <Input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                    className="pl-7 text-sm"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="col-span-1 flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={item.includeGst}
                  onChange={(e) => updateLineItem(item.id, "includeGst", e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                  title="Include GST"
                />
              </div>
              <div className="col-span-10 sm:col-span-1 text-right">
                <p className="text-sm font-medium py-2.5">{formatAUD(item.total)}</p>
              </div>
              <div className="col-span-2 sm:col-span-12 sm:hidden flex justify-end">
                <Button variant="ghost" size="icon" onClick={() => removeLineItem(item.id)} className="h-9 w-9">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
              <div className="hidden sm:flex col-span-0 justify-end">
                <Button variant="ghost" size="icon" onClick={() => removeLineItem(item.id)} className="h-9 w-9">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addLineItem} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Line Item
          </Button>

          {/* Totals */}
          {lineItems.length > 0 && (
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatAUD(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST (10%)</span>
                <span>{formatAUD(gst)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span className="text-orange-600">{formatAUD(total)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes + Validity */}
      <Card>
        <CardHeader><CardTitle className="text-base">Additional Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="notes">Notes / Terms</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Payment terms, special conditions..."
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="validUntil">Valid Until</Label>
            <Input
              id="validUntil"
              type="date"
              value={form.validUntil}
              onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <Button variant="outline" onClick={() => saveQuote(false)} disabled={loading} className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          Save Draft
        </Button>
        <Button onClick={() => saveQuote(true)} disabled={loading} className="flex-1">
          <Send className="w-4 h-4 mr-2" />
          {loading ? "Saving..." : "Send Quote"}
        </Button>
      </div>
    </div>
  );
}
