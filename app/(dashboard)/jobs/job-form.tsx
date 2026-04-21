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

interface JobFormProps {
  user: any;
  customers: any[];
  prefillData?: any;
}

export function JobForm({ user, customers, prefillData }: JobFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: prefillData?.title ?? "",
    description: prefillData?.description ?? "",
    customerId: prefillData?.customerId ?? "",
    jobType: prefillData?.jobType ?? "",
    status: prefillData?.status ?? "ENQUIRY",
    address: prefillData?.address ?? "",
    suburb: prefillData?.suburb ?? "",
    state: prefillData?.state ?? user.state ?? "",
    scheduledAt: prefillData?.scheduledAt ?? "",
    notes: prefillData?.notes ?? "",
  });

  const u = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.title) { toast.error("Enter a job title"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      toast.success("Job created");
      router.push(`/jobs/${data.id}`);
    } catch {
      toast.error("Failed to create job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">New Job</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Job Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Job Title *</Label>
            <Input value={form.title} onChange={(e) => u("title", e.target.value)} placeholder="e.g. Switchboard upgrade" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Job Type</Label>
              <Input value={form.jobType} onChange={(e) => u("jobType", e.target.value)} placeholder="e.g. Residential" className="mt-1" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => u("status", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["ENQUIRY", "QUOTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "INVOICED", "PAID"].map((s) => (
                    <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Customer</Label>
            <Select value={form.customerId} onValueChange={(v) => u("customerId", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer..." /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => u("description", e.target.value)} placeholder="Job details..." className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Location & Schedule</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Site Address</Label>
            <Input value={form.address} onChange={(e) => u("address", e.target.value)} placeholder="Street address" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Suburb</Label>
              <Input value={form.suburb} onChange={(e) => u("suburb", e.target.value)} placeholder="Suburb" className="mt-1" />
            </div>
            <div>
              <Label>State</Label>
              <Select value={form.state} onValueChange={(v) => u("state", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="State" /></SelectTrigger>
                <SelectContent>
                  {AUSTRALIAN_STATES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Scheduled Date/Time</Label>
            <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => u("scheduledAt", e.target.value)} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={form.notes} onChange={(e) => u("notes", e.target.value)} placeholder="Internal notes..." />
        </CardContent>
      </Card>

      <div className="flex gap-3 pb-8">
        <Button variant="outline" onClick={() => router.back()} className="flex-1">Cancel</Button>
        <Button onClick={save} disabled={loading} className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          {loading ? "Saving..." : "Create Job"}
        </Button>
      </div>
    </div>
  );
}
