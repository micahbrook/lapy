"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAUD, generateInvoiceNumber, calculateGST } from "@/lib/utils";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  includeGst: boolean;
  total: number;
}

interface InvoiceFormProps {
  user: any;
  customers: any[];
  jobs: any[];
  invoiceCount: number;
  prefillJobId?: string;
  prefillJob?: any;
}

export function InvoiceForm({
  user,
  customers,
  jobs,
  invoiceCount,
  prefillJobId,
  prefillJob,
}: InvoiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const defaultDueDate = format(
    addDays(new Date(), user.defaultPaymentTerms ?? 14),
    "yyyy-MM-dd"
  );

  const [form, setForm] = useState({
    jobId: prefillJobId ?? "",
    customerId: prefillJob?.customerId ?? "",
    notes: user.defaultNotes ?? "",
    dueDate: defaultDueDate,
    depositAmount: "",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([]);

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

  function handleJobChange(jobId: string) {
    const job = jobs.find((j) => j.id === jobId);
    setForm((f) => ({
      ...f,
      jobId,
      customerId: job?.customerId ?? f.customerId,
    }));
  }

  async function saveInvoice(sendNow = false) {
    if (lineItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: form.jobId || undefined,
          lineItems,
          subtotal,
          gst,
          total,
          dueDate: form.dueDate || undefined,
          depositAmount: form.depositAmount ? parseFloat(form.depositAmount) : undefined,
          notes: form.notes || undefined,
          status: sendNow ? "SENT" : "DRAFT",
        }),
      });

      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      toast.success(sendNow ? "Invoice sent!" : "Invoice saved as draft");
      router.push(`/invoices/${data.id}`);
    } catch {
      toast.error("Failed to save invoice");
    } finally {
      setLoading(false);
    }
  }

  const selectedJob = jobs.find((j) => j.id === form.jobId);
  const displayCustomer =
    selectedJob?.customer ??
    customers.find((c) => c.id === form.customerId);

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
          <p className="text-sm text-gray-500 mt-1">
            {generateInvoiceNumber(invoiceCount)}
          </p>
        </div>
      </div>

      {/* Job / Customer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job &amp; Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Link to Job (optional)</Label>
            <Select
              value={form.jobId}
              onValueChange={handleJobChange}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a job..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No job</SelectItem>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.title}
                    {j.customer ? ` · ${j.customer.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!form.jobId && (
            <div>
              <Label>Customer (optional)</Label>
              <Select
                value={form.customerId}
                onValueChange={(v) => setForm((f) => ({ ...f, customerId: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a customer..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No customer</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.suburb ? ` · ${c.suburb}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {displayCustomer && (
            <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700 space-y-0.5">
              <p className="font-medium">{displayCustomer.name}</p>
              {displayCustomer.email && <p>{displayCustomer.email}</p>}
              {displayCustomer.phone && <p>{displayCustomer.phone}</p>}
              {displayCustomer.suburb && (
                <p>
                  {displayCustomer.suburb}
                  {displayCustomer.state ? `, ${displayCustomer.state}` : ""}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
                  onChange={(e) =>
                    updateLineItem(item.id, "description", e.target.value)
                  }
                  placeholder="Description..."
                  className="text-sm"
                />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    updateLineItem(
                      item.id,
                      "quantity",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="text-sm"
                  min="0"
                  step="0.5"
                />
              </div>
              <div className="col-span-3 sm:col-span-1">
                <Select
                  value={item.unit}
                  onValueChange={(v) => updateLineItem(item.id, "unit", v)}
                >
                  <SelectTrigger className="text-xs h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["hr", "ea", "m", "m2", "m3", "day", "lump"].map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4 sm:col-span-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    $
                  </span>
                  <Input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateLineItem(
                        item.id,
                        "unitPrice",
                        parseFloat(e.target.value) || 0
                      )
                    }
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
                  onChange={(e) =>
                    updateLineItem(item.id, "includeGst", e.target.checked)
                  }
                  className="w-4 h-4 accent-orange-500"
                  title="Include GST"
                />
              </div>
              <div className="col-span-10 sm:col-span-1 text-right">
                <p className="text-sm font-medium py-2.5">
                  {formatAUD(item.total)}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-12 sm:hidden flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLineItem(item.id)}
                  className="h-9 w-9"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
              <div className="hidden sm:flex col-span-0 justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLineItem(item.id)}
                  className="h-9 w-9"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addLineItem} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Line Item
          </Button>

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

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dueDate: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="depositAmount">Deposit Required (optional)</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  $
                </span>
                <Input
                  id="depositAmount"
                  type="number"
                  value={form.depositAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, depositAmount: e.target.value }))
                  }
                  className="pl-7"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {user.bankBsb && user.bankAccount && (
            <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <p className="font-medium mb-1">Bank Details (shown on invoice)</p>
              <p>
                {user.bankName ? `${user.bankName} · ` : ""}BSB {user.bankBsb} · Acc{" "}
                {user.bankAccount}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes / Payment Terms</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Payment terms, bank details, thank you message..."
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <Button
          variant="outline"
          onClick={() => saveInvoice(false)}
          disabled={loading}
          className="flex-1"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Draft
        </Button>
        <Button
          onClick={() => saveInvoice(true)}
          disabled={loading}
          className="flex-1"
        >
          <Send className="w-4 h-4 mr-2" />
          {loading ? "Saving..." : "Send Invoice"}
        </Button>
      </div>
    </div>
  );
}
