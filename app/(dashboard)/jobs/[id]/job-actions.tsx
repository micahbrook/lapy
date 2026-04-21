"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const JOB_STATUSES = [
  { value: "ENQUIRY", label: "Enquiry" },
  { value: "QUOTED", label: "Quoted" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "INVOICED", label: "Invoiced" },
  { value: "PAID", label: "Paid" },
];

interface JobActionsProps {
  jobId: string;
  currentStatus: string;
}

export function JobActions({ jobId, currentStatus }: JobActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStatusChange(status: string) {
    if (status === currentStatus) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Job status updated to ${status.replace("_", " ")}`);
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Label className="text-sm text-gray-500 shrink-0">Update status</Label>
      <Select
        value={currentStatus}
        onValueChange={handleStatusChange}
        disabled={loading}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {JOB_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
