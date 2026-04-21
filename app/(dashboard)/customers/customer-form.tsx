"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";
import { AUSTRALIAN_STATES } from "@/lib/utils";

export function CustomerForm({ userId, prefill }: { userId: string; prefill?: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: prefill?.name ?? "",
    email: prefill?.email ?? "",
    phone: prefill?.phone ?? "",
    address: prefill?.address ?? "",
    suburb: prefill?.suburb ?? "",
    state: prefill?.state ?? "",
    postcode: prefill?.postcode ?? "",
    notes: prefill?.notes ?? "",
  });

  const u = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.name) { toast.error("Enter customer name"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      toast.success("Customer added");
      router.push(`/customers/${data.id}`);
    } catch {
      toast.error("Failed to save customer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">New Customer</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Contact Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Full Name *</Label>
            <Input value={form.name} onChange={(e) => u("name", e.target.value)} placeholder="John Smith" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => u("email", e.target.value)} placeholder="john@example.com" className="mt-1" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input type="tel" value={form.phone} onChange={(e) => u("phone", e.target.value)} placeholder="0412 345 678" className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Address</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Street Address</Label>
            <Input value={form.address} onChange={(e) => u("address", e.target.value)} placeholder="123 Main Street" className="mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Suburb</Label>
              <Input value={form.suburb} onChange={(e) => u("suburb", e.target.value)} placeholder="Suburb" className="mt-1" />
            </div>
            <div>
              <Label>Postcode</Label>
              <Input value={form.postcode} onChange={(e) => u("postcode", e.target.value)} placeholder="2000" className="mt-1" />
            </div>
          </div>
          <div>
            <Label>State</Label>
            <Select value={form.state} onValueChange={(v) => u("state", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>
                {AUSTRALIAN_STATES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => u("notes", e.target.value)} placeholder="Any notes about this customer..." className="mt-1" />
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-3 pb-8">
        <Button variant="outline" onClick={() => router.back()} className="flex-1">Cancel</Button>
        <Button onClick={save} disabled={loading} className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          {loading ? "Saving..." : "Save Customer"}
        </Button>
      </div>
    </div>
  );
}
