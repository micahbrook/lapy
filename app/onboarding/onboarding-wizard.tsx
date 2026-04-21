"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  Building2,
  Paintbrush,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Zap,
  Users,
  Briefcase,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRADE_TYPES, AUSTRALIAN_STATES } from "@/lib/utils";
import { STRIPE_PLANS } from "@/lib/stripe";

const STEPS = [
  { id: 1, title: "Business Details", icon: Building2 },
  { id: 2, title: "Branding", icon: Paintbrush },
  { id: 3, title: "Choose Plan", icon: CreditCard },
  { id: 4, title: "All Set!", icon: CheckCircle2 },
];

interface OnboardingWizardProps {
  clerkId: string;
  existingUser: any;
}

export function OnboardingWizard({ clerkId, existingUser }: OnboardingWizardProps) {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    businessName: existingUser?.businessName ?? "",
    abn: existingUser?.abn ?? "",
    tradeType: existingUser?.tradeType ?? "",
    state: existingUser?.state ?? "",
    licenceNumber: existingUser?.licenceNumber ?? "",
    phone: existingUser?.phone ?? "",
    brandColour: existingUser?.brandColour ?? "#f97316",
    logoUrl: existingUser?.logoUrl ?? "",
    plan: "SOLO",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function saveStep(finalStep = false) {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          name: clerkUser?.fullName ?? "",
          email: clerkUser?.primaryEmailAddress?.emailAddress ?? "",
          complete: finalStep,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      if (finalStep) {
        router.push("/dashboard");
      } else {
        setStep((s) => s + 1);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  step > s.id
                    ? "bg-green-500 text-white"
                    : step === s.id
                    ? "bg-orange-500 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step > s.id ? "✓" : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-16 sm:w-24 mx-1 ${step > s.id ? "bg-green-500" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500">Step {step} of {STEPS.length} — {STEPS[step - 1].title}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Tell us about your business</h2>
            <div>
              <Label htmlFor="businessName">Business Name *</Label>
              <Input id="businessName" placeholder="Smith Electrical Pty Ltd" value={form.businessName} onChange={(e) => update("businessName", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="abn">ABN</Label>
              <Input id="abn" placeholder="12 345 678 901" value={form.abn} onChange={(e) => update("abn", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Trade Type *</Label>
              <Select value={form.tradeType} onValueChange={(v) => update("tradeType", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select your trade" />
                </SelectTrigger>
                <SelectContent>
                  {TRADE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>State / Territory *</Label>
              <Select value={form.state} onValueChange={(v) => update("state", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select your state" />
                </SelectTrigger>
                <SelectContent>
                  {AUSTRALIAN_STATES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="licenceNumber">Licence Number</Label>
              <Input id="licenceNumber" placeholder="EC12345" value={form.licenceNumber} onChange={(e) => update("licenceNumber", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="phone">Mobile Number</Label>
              <Input id="phone" type="tel" placeholder="0412 345 678" value={form.phone} onChange={(e) => update("phone", e.target.value)} className="mt-1" />
            </div>
            <Button
              className="w-full"
              disabled={!form.businessName || !form.tradeType || !form.state}
              onClick={() => saveStep(false)}
            >
              {loading ? "Saving..." : "Continue"}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Brand your business</h2>
            <div>
              <Label>Business Logo</Label>
              <div className="mt-1 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                <p className="text-sm text-gray-500">Logo upload coming soon</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
              </div>
            </div>
            <div>
              <Label htmlFor="brandColour">Brand Colour</Label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="color"
                  id="brandColour"
                  value={form.brandColour}
                  onChange={(e) => update("brandColour", e.target.value)}
                  className="w-12 h-11 rounded-md border border-input cursor-pointer"
                />
                <Input value={form.brandColour} onChange={(e) => update("brandColour", e.target.value)} placeholder="#f97316" className="flex-1" />
              </div>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: form.brandColour + "20", borderLeft: `4px solid ${form.brandColour}` }}>
              <p className="text-sm font-medium" style={{ color: form.brandColour }}>Preview</p>
              <p className="text-xs text-gray-500 mt-1">This colour will appear on your quotes, invoices, and SWMS documents.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button onClick={() => saveStep(false)} disabled={loading} className="flex-1">
                {loading ? "Saving..." : "Continue"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Choose your plan</h2>
            <div className="space-y-3">
              {(Object.entries(STRIPE_PLANS) as [string, typeof STRIPE_PLANS.SOLO][]).map(([key, plan]) => (
                <div
                  key={key}
                  onClick={() => update("plan", key)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    form.plan === key ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.plan === key ? "border-orange-500" : "border-gray-300"}`}>
                        {form.plan === key && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                      </div>
                      <span className="font-semibold text-gray-900">{plan.name}</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      ${plan.price}<span className="text-sm font-normal text-gray-500">/mo</span>
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 ml-6 mb-2">{plan.description}</p>
                  <ul className="ml-6 space-y-1">
                    {plan.features.slice(0, 3).map((f) => (
                      <li key={f} className="text-xs text-gray-600 flex items-center gap-1">
                        <span className="text-green-500">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center">14-day free trial · No credit card required to start</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button onClick={() => saveStep(false)} disabled={loading} className="flex-1">
                {loading ? "Setting up..." : "Start Free Trial"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">You're all set!</h2>
              <p className="text-gray-500 mt-2">Welcome to TradieMate, {form.businessName}.</p>
            </div>
            <div className="text-left space-y-3">
              <p className="text-sm font-semibold text-gray-700">Quick-start checklist:</p>
              {[
                { icon: Users, text: "Add your first customer", href: "/customers/new" },
                { icon: Briefcase, text: "Create your first quote", href: "/quotes/new" },
                { icon: ShieldCheck, text: "Generate a SWMS", href: "/swms/new" },
              ].map(({ icon: Icon, text, href }) => (
                <div key={href} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-orange-600" />
                  </div>
                  <span className="text-sm text-gray-700">{text}</span>
                </div>
              ))}
            </div>
            <Button className="w-full" size="lg" onClick={() => saveStep(true)} disabled={loading}>
              {loading ? "Setting up..." : "Go to Dashboard"}
              <Zap className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
