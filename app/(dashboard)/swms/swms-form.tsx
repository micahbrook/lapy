"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ShieldCheck,
  Sparkles,
  Save,
  FileDown,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  HardHat,
  Eye,
  EarOff,
  Hand,
  Hammer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateSwmsNumber } from "@/lib/utils";

const HRCW_CATEGORIES = [
  "Work involving a risk of a person falling more than 2 metres",
  "Work on a telecommunication tower",
  "Work involving demolition of an element of a structure",
  "Work involving disturbance or removal of asbestos",
  "Work involving structural alterations requiring temporary support",
  "Work in or near a confined space",
  "Work in or near a shaft or trench deeper than 1.5 metres",
  "Work using explosives",
  "Work on or near pressurised gas distribution mains or piping",
  "Work on or near chemical, fuel or refrigerant lines",
  "Work on or near energised electrical installations or services",
  "Work in an area that may have a contaminated or flammable atmosphere",
  "Work involving tilt-up or precast concrete elements",
  "Work on, in or adjacent to a road, railway, shipping lane or other traffic corridor",
  "Work in an area at a workplace with artificial extremes of temperature",
  "Work in or near water or other liquids that may cause drowning",
  "Work involving diving",
];

const PPE_ITEMS = [
  { id: "hard_hat", label: "Hard Hat", icon: "🪖" },
  { id: "safety_glasses", label: "Safety Glasses", icon: "🥽" },
  { id: "hi_vis", label: "Hi-Vis Vest", icon: "🦺" },
  { id: "steel_caps", label: "Steel Cap Boots", icon: "👢" },
  { id: "gloves", label: "Safety Gloves", icon: "🧤" },
  { id: "hearing", label: "Hearing Protection", icon: "🔇" },
  { id: "dust_mask", label: "Dust Mask / P2 Respirator", icon: "😷" },
  { id: "fall_arrest", label: "Fall Arrest Harness", icon: "⛓️" },
  { id: "face_shield", label: "Face Shield", icon: "🛡️" },
  { id: "arc_flash", label: "Arc Flash Protection", icon: "⚡" },
  { id: "insulated_gloves", label: "Insulated Gloves (1000V)", icon: "🧤" },
  { id: "rubber_boots", label: "Rubber Insulating Boots", icon: "🥾" },
];

interface SwmsFormProps {
  user: any;
  jobs: any[];
  swmsCount: number;
  templateData?: any;
  prefillJob?: any;
}

export function SwmsForm({ user, jobs, swmsCount, templateData, prefillJob }: SwmsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    scope: true,
    hrcw: true,
    hazards: true,
    ppe: true,
    emergency: true,
  });

  const [form, setForm] = useState({
    jobId: prefillJob?.id ?? "",
    jobDescription: templateData?.jobDescription ?? prefillJob?.description ?? "",
    siteAddress: templateData?.siteAddress ?? prefillJob?.address ?? "",
    principalContractor: templateData?.principalContractor ?? "",
    scopeOfWork: templateData?.scopeOfWork ?? "",
    highRiskWork: templateData?.highRiskWork ?? false,
    highRiskCategories: (templateData?.highRiskCategories as string[]) ?? [],
    hazards: (templateData?.hazards as any[]) ?? [],
    ppe: (templateData?.ppe as any[]) ?? PPE_ITEMS.map((p) => ({ ...p, required: false })),
    emergencyProcedures: templateData?.emergencyProcedures ?? "",
    nearestHospital: templateData?.nearestHospital ?? "",
    isTemplate: false,
    templateName: "",
  });

  const toggleSection = (key: string) =>
    setExpandedSections((s) => ({ ...s, [key]: !s[key] }));

  async function generateWithAI() {
    if (!form.jobDescription) {
      toast.error("Please enter a job description first");
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/generate-swms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: form.jobDescription,
          siteAddress: form.siteAddress,
          tradeType: user.tradeType,
          state: user.state,
          principalContractor: form.principalContractor,
        }),
      });

      if (!res.ok) throw new Error("Generation failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      let rawText = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawText += decoder.decode(value, { stream: true });
      }

      // Parse JSON from streamed response
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid AI response");

      const aiData = JSON.parse(jsonMatch[0]);

      setForm((f) => ({
        ...f,
        scopeOfWork: aiData.scopeOfWork ?? f.scopeOfWork,
        highRiskWork: aiData.highRiskWork ?? f.highRiskWork,
        highRiskCategories: aiData.highRiskCategories ?? f.highRiskCategories,
        hazards: aiData.hazards ?? f.hazards,
        ppe: PPE_ITEMS.map((item) => {
          const aiPpe = aiData.ppe?.find((p: any) =>
            p.item?.toLowerCase().includes(item.label.toLowerCase().split(" ")[0].toLowerCase())
          );
          return { ...item, required: aiPpe?.required ?? false, specification: aiPpe?.specification };
        }),
        emergencyProcedures: aiData.emergencyProcedures ?? f.emergencyProcedures,
        nearestHospital: aiData.nearestHospital ?? f.nearestHospital,
      }));

      toast.success("SWMS generated! Review and edit each section.");
    } catch (err) {
      toast.error("AI generation failed. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }

  async function saveSWMS() {
    setLoading(true);
    try {
      const res = await fetch("/api/swms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          swmsNumber: generateSwmsNumber(swmsCount),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      toast.success("SWMS saved successfully");
      router.push(`/swms/${data.id}`);
    } catch {
      toast.error("Failed to save SWMS");
    } finally {
      setLoading(false);
    }
  }

  function addHazard() {
    setForm((f) => ({
      ...f,
      hazards: [
        ...f.hazards,
        {
          id: crypto.randomUUID(),
          hazard: "",
          likelihood: "Medium",
          consequence: "Medium",
          initialRisk: "Medium",
          controls: [""],
          residualRisk: "Low",
          responsiblePerson: "",
        },
      ],
    }));
  }

  function updateHazard(idx: number, field: string, value: any) {
    setForm((f) => ({
      ...f,
      hazards: f.hazards.map((h, i) => (i === idx ? { ...h, [field]: value } : h)),
    }));
  }

  function removeHazard(idx: number) {
    setForm((f) => ({ ...f, hazards: f.hazards.filter((_, i) => i !== idx) }));
  }

  function togglePpe(id: string) {
    setForm((f) => ({
      ...f,
      ppe: f.ppe.map((p: any) => (p.id === id ? { ...p, required: !p.required } : p)),
    }));
  }

  function toggleHRCW(category: string) {
    setForm((f) => ({
      ...f,
      highRiskCategories: f.highRiskCategories.includes(category)
        ? f.highRiskCategories.filter((c) => c !== category)
        : [...f.highRiskCategories, category],
      highRiskWork: !f.highRiskCategories.includes(category)
        ? true
        : f.highRiskCategories.filter((c) => c !== category).length > 0,
    }));
  }

  const riskColor = (risk: string) => {
    if (risk === "High") return "text-red-600 bg-red-50";
    if (risk === "Medium") return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-orange-500" />
            New SWMS
          </h1>
          <p className="text-sm text-gray-500 mt-1">{generateSwmsNumber(swmsCount)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={saveSWMS} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Job Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {jobs.length > 0 && (
            <div>
              <Label>Link to Job (optional)</Label>
              <Select value={form.jobId} onValueChange={(v) => setForm((f) => ({ ...f, jobId: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a job or leave blank for standalone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Standalone SWMS</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title} — {job.customer?.name ?? "No customer"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="jobDescription">Job Description *</Label>
            <Textarea
              id="jobDescription"
              placeholder="Describe the work to be performed in detail..."
              value={form.jobDescription}
              onChange={(e) => setForm((f) => ({ ...f, jobDescription: e.target.value }))}
              className="mt-1 min-h-[100px]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="siteAddress">Site Address</Label>
              <Input
                id="siteAddress"
                placeholder="123 Smith St, Sydney NSW 2000"
                value={form.siteAddress}
                onChange={(e) => setForm((f) => ({ ...f, siteAddress: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="principalContractor">Principal Contractor</Label>
              <Input
                id="principalContractor"
                placeholder="N/A or contractor name"
                value={form.principalContractor}
                onChange={(e) => setForm((f) => ({ ...f, principalContractor: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <Button
            onClick={generateWithAI}
            disabled={aiLoading || !form.jobDescription}
            className="w-full"
            size="lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {aiLoading ? "Generating SWMS with AI..." : "Generate SWMS with AI"}
          </Button>
          {aiLoading && (
            <p className="text-xs text-center text-gray-500 animate-pulse">
              Claude is analysing the job and generating your SWMS...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Scope of Work */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection("scope")}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">1. Scope of Work</CardTitle>
            {expandedSections.scope ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardHeader>
        {expandedSections.scope && (
          <CardContent>
            <Textarea
              placeholder="Detailed scope of work..."
              value={form.scopeOfWork}
              onChange={(e) => setForm((f) => ({ ...f, scopeOfWork: e.target.value }))}
              className="min-h-[120px]"
            />
          </CardContent>
        )}
      </Card>

      {/* HRCW */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection("hrcw")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">2. High Risk Construction Work</CardTitle>
              {form.highRiskWork && <Badge variant="destructive">HRCW Identified</Badge>}
            </div>
            {expandedSections.hrcw ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardHeader>
        {expandedSections.hrcw && (
          <CardContent>
            <p className="text-xs text-gray-500 mb-3">
              Select all that apply (WHS Regulation 2011, Schedule 3):
            </p>
            <div className="space-y-2">
              {HRCW_CATEGORIES.map((cat) => (
                <label key={cat} className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={form.highRiskCategories.includes(cat)}
                    onChange={() => toggleHRCW(cat)}
                    className="mt-0.5 w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{cat}</span>
                </label>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Hazard Register */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection("hazards")}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">3. Hazard Register ({form.hazards.length})</CardTitle>
            {expandedSections.hazards ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardHeader>
        {expandedSections.hazards && (
          <CardContent className="space-y-4">
            {form.hazards.map((hazard, idx) => (
              <div key={hazard.id ?? idx} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Hazard {idx + 1}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeHazard(idx)} className="h-6 w-6">
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
                <div>
                  <Label>Hazard Description</Label>
                  <Input
                    value={hazard.hazard}
                    onChange={(e) => updateHazard(idx, "hazard", e.target.value)}
                    placeholder="Describe the hazard..."
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["likelihood", "consequence", "initialRisk"].map((field) => (
                    <div key={field}>
                      <Label className="text-xs capitalize">{field.replace(/([A-Z])/g, " $1")}</Label>
                      <Select value={hazard[field]} onValueChange={(v) => updateHazard(idx, field, v)}>
                        <SelectTrigger className="mt-1 h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["High", "Medium", "Low"].map((r) => (
                            <SelectItem key={r} value={r}>
                              <span className={`text-xs font-medium ${riskColor(r)} px-1 rounded`}>{r}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <div>
                  <Label>Control Measures</Label>
                  {(hazard.controls as string[]).map((control, ci) => (
                    <div key={ci} className="flex gap-2 mt-1">
                      <Input
                        value={control}
                        onChange={(e) => {
                          const newControls = [...hazard.controls];
                          newControls[ci] = e.target.value;
                          updateHazard(idx, "controls", newControls);
                        }}
                        placeholder="Control measure..."
                        className="flex-1"
                      />
                      {ci === hazard.controls.length - 1 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateHazard(idx, "controls", [...hazard.controls, ""])}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Residual Risk</Label>
                    <Select value={hazard.residualRisk} onValueChange={(v) => updateHazard(idx, "residualRisk", v)}>
                      <SelectTrigger className="mt-1 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["High", "Medium", "Low"].map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Responsible Person</Label>
                    <Input
                      value={hazard.responsiblePerson}
                      onChange={(e) => updateHazard(idx, "responsiblePerson", e.target.value)}
                      placeholder="e.g. Site Supervisor"
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addHazard} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Hazard
            </Button>
          </CardContent>
        )}
      </Card>

      {/* PPE */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection("ppe")}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">4. PPE Requirements</CardTitle>
            {expandedSections.ppe ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardHeader>
        {expandedSections.ppe && (
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {form.ppe.map((item: any) => (
                <label
                  key={item.id}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    item.required
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.required}
                    onChange={() => togglePpe(item.id)}
                    className="w-4 h-4 accent-orange-500 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-lg">{item.icon}</span>
                    <p className="text-xs font-medium text-gray-800 leading-tight mt-0.5">{item.label}</p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Emergency Procedures */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection("emergency")}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">5. Emergency Procedures</CardTitle>
            {expandedSections.emergency ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardHeader>
        {expandedSections.emergency && (
          <CardContent className="space-y-4">
            <div>
              <Label>Emergency Procedures</Label>
              <Textarea
                value={form.emergencyProcedures}
                onChange={(e) => setForm((f) => ({ ...f, emergencyProcedures: e.target.value }))}
                placeholder="In case of emergency, immediately..."
                className="mt-1 min-h-[120px]"
              />
            </div>
            <div>
              <Label>Nearest Hospital</Label>
              <Input
                value={form.nearestHospital}
                onChange={(e) => setForm((f) => ({ ...f, nearestHospital: e.target.value }))}
                placeholder="Hospital name and address"
                className="mt-1"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Save as Template */}
      <Card>
        <CardContent className="pt-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isTemplate}
              onChange={(e) => setForm((f) => ({ ...f, isTemplate: e.target.checked }))}
              className="w-4 h-4 accent-orange-500"
            />
            <span className="text-sm font-medium">Save as reusable template</span>
          </label>
          {form.isTemplate && (
            <Input
              value={form.templateName}
              onChange={(e) => setForm((f) => ({ ...f, templateName: e.target.value }))}
              placeholder="e.g. Standard Switchboard Replacement"
              className="mt-3"
            />
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <Button variant="outline" onClick={() => router.back()} className="flex-1">
          Cancel
        </Button>
        <Button onClick={saveSWMS} disabled={loading} className="flex-1" size="lg">
          <Save className="w-4 h-4 mr-2" />
          {loading ? "Saving..." : "Save SWMS"}
        </Button>
      </div>
    </div>
  );
}
