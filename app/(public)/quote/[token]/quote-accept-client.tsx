"use client";

import { useState } from "react";

interface QuoteAcceptClientProps {
  token: string;
  quoteNumber: string;
  brand: string;
}

export function QuoteAcceptClient({ token, quoteNumber, brand }: QuoteAcceptClientProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "accepted" | "declined" | "error">(
    "idle"
  );
  const [error, setError] = useState("");

  async function handleAction(action: "accept" | "decline") {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch(`/api/public/quotes/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        setStatus("error");
        return;
      }
      setStatus(action === "accept" ? "accepted" : "declined");
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "accepted") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <p className="text-2xl mb-2">✓</p>
        <p className="text-green-800 font-semibold text-lg">Quote Accepted!</p>
        <p className="text-green-700 text-sm mt-1">
          We&apos;ll be in touch shortly to confirm scheduling.
        </p>
      </div>
    );
  }

  if (status === "declined") {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <p className="text-gray-600">You&apos;ve declined this quote. Please contact us if you change your mind.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h3 className="font-semibold text-gray-900 mb-1">Ready to proceed?</h3>
      <p className="text-sm text-gray-500 mb-4">
        Accept {quoteNumber} to confirm the work. You can also decline if you need to reconsider.
      </p>

      {error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => handleAction("accept")}
          disabled={status === "loading"}
          style={{ backgroundColor: brand }}
          className="flex-1 py-3 rounded-lg text-white font-semibold disabled:opacity-60 transition-opacity"
        >
          {status === "loading" ? "Processing…" : "Accept Quote"}
        </button>
        <button
          onClick={() => handleAction("decline")}
          disabled={status === "loading"}
          className="px-5 py-3 rounded-lg border border-gray-300 text-gray-600 font-medium disabled:opacity-60 hover:bg-gray-50 transition-colors"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
