"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Package, Pencil, Trash2, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatAUD } from "@/lib/utils";

interface Part {
  id: string;
  name: string;
  sku: string | null;
  supplier: string | null;
  unitCost: any;
  sellPrice: any;
  unit: string | null;
  stockLevel: number | null;
}

interface PartsClientProps {
  userId: string;
  initialParts: Part[];
}

const emptyForm = {
  name: "",
  sku: "",
  supplier: "",
  unitCost: "",
  sellPrice: "",
  unit: "ea",
  stockLevel: "",
};

export function PartsClient({ userId, initialParts }: PartsClientProps) {
  const [parts, setParts] = useState<Part[]>(initialParts);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const u = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(part: Part) {
    setEditing(part);
    setForm({
      name: part.name,
      sku: part.sku ?? "",
      supplier: part.supplier ?? "",
      unitCost: String(Number(part.unitCost)),
      sellPrice: String(Number(part.sellPrice)),
      unit: part.unit ?? "ea",
      stockLevel: String(part.stockLevel ?? ""),
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name) { toast.error("Enter part name"); return; }
    setLoading(true);
    try {
      const body = {
        name: form.name,
        sku: form.sku || null,
        supplier: form.supplier || null,
        unitCost: parseFloat(form.unitCost) || 0,
        sellPrice: parseFloat(form.sellPrice) || 0,
        unit: form.unit || "ea",
        stockLevel: form.stockLevel ? parseInt(form.stockLevel) : null,
      };

      if (editing) {
        const res = await fetch(`/api/parts/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        const updated = await res.json();
        setParts((p) => p.map((x) => (x.id === editing.id ? updated : x)));
        toast.success("Part updated");
      } else {
        const res = await fetch("/api/parts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        const created = await res.json();
        setParts((p) => [created, ...p]);
        toast.success("Part added");
      }
      setOpen(false);
    } catch {
      toast.error("Failed to save part");
    } finally {
      setLoading(false);
    }
  }

  async function deletePart(id: string) {
    if (!confirm("Delete this part?")) return;
    try {
      const res = await fetch(`/api/parts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setParts((p) => p.filter((x) => x.id !== id));
      toast.success("Part deleted");
    } catch {
      toast.error("Failed to delete part");
    }
  }

  const filtered = parts.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.supplier ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const margin = (part: Part) => {
    const cost = Number(part.unitCost);
    const sell = Number(part.sellPrice);
    if (!sell) return null;
    return Math.round(((sell - cost) / sell) * 100);
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="w-6 h-6 text-orange-500" />
          Parts &amp; Materials
        </h1>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Part
        </Button>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, SKU, supplier..."
        className="mb-4 max-w-sm"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {parts.length === 0 ? "No parts yet" : "No results"}
          </h3>
          {parts.length === 0 && (
            <Button onClick={openNew} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Add First Part
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header row - desktop */}
          <div className="hidden sm:grid grid-cols-12 gap-3 text-xs text-gray-500 font-medium uppercase px-4">
            <span className="col-span-3">Name / SKU</span>
            <span className="col-span-2">Supplier</span>
            <span className="col-span-2 text-right">Cost</span>
            <span className="col-span-2 text-right">Sell</span>
            <span className="col-span-1 text-right">Margin</span>
            <span className="col-span-1 text-right">Stock</span>
            <span className="col-span-1" />
          </div>

          {filtered.map((part) => (
            <Card key={part.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="sm:grid sm:grid-cols-12 sm:gap-3 sm:items-center">
                  <div className="col-span-3 mb-2 sm:mb-0">
                    <p className="font-medium text-gray-900">{part.name}</p>
                    {part.sku && (
                      <p className="text-xs text-gray-400">{part.sku}</p>
                    )}
                    <p className="text-xs text-gray-400">{part.unit}</p>
                  </div>
                  <div className="col-span-2 text-sm text-gray-600 mb-1 sm:mb-0">
                    {part.supplier ?? "—"}
                  </div>
                  <div className="col-span-2 text-right text-sm">
                    {formatAUD(Number(part.unitCost))}
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium">
                    {formatAUD(Number(part.sellPrice))}
                  </div>
                  <div className="col-span-1 text-right">
                    {margin(part) !== null && (
                      <span
                        className={`text-xs font-medium ${
                          (margin(part) ?? 0) >= 30
                            ? "text-green-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {margin(part)}%
                      </span>
                    )}
                  </div>
                  <div className="col-span-1 text-right text-sm text-gray-600">
                    {part.stockLevel ?? "—"}
                  </div>
                  <div className="col-span-1 flex justify-end gap-1 mt-2 sm:mt-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(part)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-600"
                      onClick={() => deletePart(part.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Part" : "Add Part"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => u("name", e.target.value)}
                placeholder="e.g. 20A Circuit Breaker"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>SKU</Label>
                <Input
                  value={form.sku}
                  onChange={(e) => u("sku", e.target.value)}
                  placeholder="ABC-123"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => u("unit", e.target.value)}
                  placeholder="ea, m, box..."
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Supplier</Label>
              <Input
                value={form.supplier}
                onChange={(e) => u("supplier", e.target.value)}
                placeholder="e.g. Reece, Tradelink"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cost Price</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    $
                  </span>
                  <Input
                    type="number"
                    value={form.unitCost}
                    onChange={(e) => u("unitCost", e.target.value)}
                    className="pl-7"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <Label>Sell Price</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    $
                  </span>
                  <Input
                    type="number"
                    value={form.sellPrice}
                    onChange={(e) => u("sellPrice", e.target.value)}
                    className="pl-7"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label>Stock Level</Label>
              <Input
                type="number"
                value={form.stockLevel}
                onChange={(e) => u("stockLevel", e.target.value)}
                placeholder="e.g. 10"
                className="mt-1"
                min="0"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
