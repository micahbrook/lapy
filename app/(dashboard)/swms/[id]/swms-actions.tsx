"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PenLine, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SwmsActionsProps {
  swms: any;
}

export function SwmsActions({ swms }: SwmsActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/swms/${swms.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`SWMS ${status === "SIGNED" ? "signed" : "archived"}`);
      router.refresh();
    } catch {
      toast.error("Failed to update SWMS");
    } finally {
      setLoading(false);
    }
  }

  const isDraft = swms.status === "DRAFT";
  const isSigned = swms.status === "SIGNED";

  return (
    <div className="flex flex-wrap gap-2">
      {isDraft && (
        <Button onClick={() => updateStatus("SIGNED")} disabled={loading}>
          <PenLine className="w-4 h-4 mr-2" />
          Mark as Signed
        </Button>
      )}
      {(isDraft || isSigned) && (
        <Button
          variant="outline"
          onClick={() => updateStatus("ARCHIVED")}
          disabled={loading}
        >
          <Archive className="w-4 h-4 mr-2" />
          Archive
        </Button>
      )}
    </div>
  );
}
