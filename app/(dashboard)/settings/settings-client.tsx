"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Save, CreditCard, Zap, ExternalLink } from "lucide-react";
import { TRADE_TYPES, AUSTRALIAN_STATES } from "@/lib/utils";
import { STRIPE_PLANS } from "@/lib/stripe";
import { formatDate } from "@/lib/utils";

export function SettingsClient({ user, subscription }: { user: any; subscription: any }) {
  const [saving, setSaving] = useState(false);
  const [billingLoading, setBillingLoading] = useState<string | null>(null);

  async function handleUpgrade(plan: string) {
    setBillingLoading(plan);
    try {
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error ?? "Something went wrong");
    } catch {
      toast.error("Network error");
    } finally {
      setBillingLoading(null);
    }
  }

  async function handleManageBilling() {
    setBillingLoading("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error ?? "Something went wrong");
    } catch {
      toast.error("Network error");
    } finally {
      setBillingLoading(null);
    }
  }
  const [profile, setProfile] = useState({
    businessName: user.businessName ?? "",
    abn: user.abn ?? "",
    tradeType: user.tradeType ?? "",
    state: user.state ?? "",
    licenceNumber: user.licenceNumber ?? "",
    phone: user.phone ?? "",
    brandColour: user.brandColour ?? "#f97316",
    bankBsb: user.bankBsb ?? "",
    bankAccount: user.bankAccount ?? "",
    bankName: user.bankName ?? "",
    defaultPaymentTerms: user.defaultPaymentTerms ?? 14,
    defaultQuoteValidity: user.defaultQuoteValidity ?? 30,
    defaultNotes: user.defaultNotes ?? "",
    invoiceFooter: user.invoiceFooter ?? "",
  });

  const u = (k: string, v: any) => setProfile((p) => ({ ...p, [k]: v }));

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const currentPlan = STRIPE_PLANS[subscription?.plan as keyof typeof STRIPE_PLANS];

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <Tabs defaultValue="profile">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="defaults">Defaults</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Business Name</Label>
                <Input value={profile.businessName} onChange={(e) => u("businessName", e.target.value)} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ABN</Label>
                  <Input value={profile.abn} onChange={(e) => u("abn", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Licence Number</Label>
                  <Input value={profile.licenceNumber} onChange={(e) => u("licenceNumber", e.target.value)} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Trade Type</Label>
                  <Select value={profile.tradeType} onValueChange={(v) => u("tradeType", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRADE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>State</Label>
                  <Select value={profile.state} onValueChange={(v) => u("state", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AUSTRALIAN_STATES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Mobile Number</Label>
                <Input type="tel" value={profile.phone} onChange={(e) => u("phone", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Brand Colour</Label>
                <div className="flex gap-3 mt-1">
                  <input type="color" value={profile.brandColour} onChange={(e) => u("brandColour", e.target.value)} className="w-12 h-11 rounded cursor-pointer border" />
                  <Input value={profile.brandColour} onChange={(e) => u("brandColour", e.target.value)} className="flex-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bank Details (for Invoice Footers)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Bank Name</Label>
                <Input value={profile.bankName} onChange={(e) => u("bankName", e.target.value)} placeholder="e.g. Commonwealth Bank" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>BSB</Label>
                  <Input value={profile.bankBsb} onChange={(e) => u("bankBsb", e.target.value)} placeholder="062-000" className="mt-1" />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input value={profile.bankAccount} onChange={(e) => u("bankAccount", e.target.value)} placeholder="12345678" className="mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={saveProfile} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{currentPlan?.name ?? subscription?.plan ?? "Free Trial"}</p>
                    <p className="text-sm text-gray-500">
                      {subscription?.status === "TRIALING" ? "Free trial" : `$${currentPlan?.price ?? 0}/month`}
                    </p>
                  </div>
                </div>
                <Badge variant={subscription?.status === "ACTIVE" ? "success" : "warning"}>
                  {subscription?.status ?? "TRIALING"}
                </Badge>
              </div>
              {subscription?.currentPeriodEnd && (
                <p className="text-sm text-gray-500">
                  {subscription.status === "TRIALING"
                    ? `Trial ends ${formatDate(subscription.currentPeriodEnd)}`
                    : `Next billing ${formatDate(subscription.currentPeriodEnd)}`}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {(Object.entries(STRIPE_PLANS) as [string, typeof STRIPE_PLANS.SOLO][]).map(([key, plan]) => (
              <Card key={key} className={subscription?.plan === key ? "border-orange-500" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{plan.name}</p>
                        {subscription?.plan === key && <Badge>Current</Badge>}
                      </div>
                      <p className="text-sm text-gray-500">${plan.price}/month</p>
                    </div>
                    {subscription?.plan !== key && (
                      <Button
                        size="sm"
                        variant={subscription?.plan === "SOLO" && key !== "SOLO" ? "default" : "outline"}
                        onClick={() => handleUpgrade(key)}
                        disabled={billingLoading === key}
                      >
                        {billingLoading === key ? "Loading…" : key === "SOLO" ? "Downgrade" : "Upgrade"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {subscription?.stripeCustomerId && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleManageBilling}
              disabled={billingLoading === "portal"}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {billingLoading === "portal" ? "Loading…" : "Manage Billing"}
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          )}
        </TabsContent>

        <TabsContent value="defaults" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quote & Invoice Defaults</CardTitle>
              <CardDescription>Pre-fill these values when creating new documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payment Terms (days)</Label>
                  <Input
                    type="number"
                    value={profile.defaultPaymentTerms}
                    onChange={(e) => u("defaultPaymentTerms", parseInt(e.target.value))}
                    className="mt-1"
                    min="1"
                  />
                </div>
                <div>
                  <Label>Quote Validity (days)</Label>
                  <Input
                    type="number"
                    value={profile.defaultQuoteValidity}
                    onChange={(e) => u("defaultQuoteValidity", parseInt(e.target.value))}
                    className="mt-1"
                    min="1"
                  />
                </div>
              </div>
              <div>
                <Label>Default Notes/Terms</Label>
                <Textarea
                  value={profile.defaultNotes}
                  onChange={(e) => u("defaultNotes", e.target.value)}
                  placeholder="e.g. Payment due within 14 days of invoice date..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Invoice Footer</Label>
                <Textarea
                  value={profile.invoiceFooter}
                  onChange={(e) => u("invoiceFooter", e.target.value)}
                  placeholder="Bank details, thank you message..."
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
          <Button onClick={saveProfile} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Defaults"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
