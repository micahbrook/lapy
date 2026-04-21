"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, ExternalLink, Zap, Users, Building2 } from "lucide-react";
import { STRIPE_PLANS } from "@/lib/stripe";
import { formatDate } from "@/lib/utils";

const PLAN_ICONS = {
  SOLO: Zap,
  CREW: Users,
  BUSINESS: Building2,
} as const;

function statusBadge(status: string) {
  if (status === "ACTIVE") return <Badge className="bg-green-100 text-green-800">Active</Badge>;
  if (status === "TRIALING") return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>;
  if (status === "PAST_DUE") return <Badge className="bg-red-100 text-red-800">Past Due</Badge>;
  if (status === "CANCELED") return <Badge className="bg-gray-100 text-gray-700">Canceled</Badge>;
  return null;
}

export function BillingClient({ user, subscription }: { user: any; subscription: any }) {
  const [loading, setLoading] = useState<string | null>(null);

  const trialDaysLeft = user.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86400000))
    : 0;

  const currentPlan = subscription?.plan ?? null;
  const isActive = subscription?.status === "ACTIVE";
  const isTrialing = subscription?.status === "TRIALING" || !subscription;

  async function handleUpgrade(plan: string) {
    setLoading(plan);
    try {
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error ?? "Something went wrong");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(null);
    }
  }

  async function handleManage() {
    setLoading("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error ?? "Something went wrong");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-500 mt-1">Manage your plan and payment details.</p>
      </div>

      {/* Current plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">
                {currentPlan ? STRIPE_PLANS[currentPlan as keyof typeof STRIPE_PLANS].name : "Trial"}
              </span>
              {subscription ? statusBadge(subscription.status) : (
                <Badge className="bg-blue-100 text-blue-800">Trial</Badge>
              )}
            </div>
            {isTrialing && trialDaysLeft > 0 && (
              <p className="text-sm text-amber-600">
                {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining in trial
              </p>
            )}
            {isTrialing && trialDaysLeft === 0 && (
              <p className="text-sm text-red-600">Trial expired — upgrade to continue</p>
            )}
            {subscription?.currentPeriodEnd && isActive && (
              <p className="text-sm text-gray-500">
                {subscription.cancelAtPeriodEnd
                  ? `Cancels ${formatDate(subscription.currentPeriodEnd)}`
                  : `Renews ${formatDate(subscription.currentPeriodEnd)}`}
              </p>
            )}
          </div>
          {isActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManage}
              disabled={loading === "portal"}
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              {loading === "portal" ? "Loading…" : "Manage Billing"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.entries(STRIPE_PLANS) as [keyof typeof STRIPE_PLANS, (typeof STRIPE_PLANS)[keyof typeof STRIPE_PLANS]][]).map(([key, plan]) => {
          const Icon = PLAN_ICONS[key];
          const isCurrent = currentPlan === key && isActive;

          return (
            <Card
              key={key}
              className={isCurrent ? "border-orange-400 ring-1 ring-orange-400" : ""}
            >
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {isCurrent && (
                    <Badge className="bg-orange-100 text-orange-800 ml-auto">Current</Badge>
                  )}
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <p className="text-2xl font-bold mt-2">
                  ${plan.price}
                  <span className="text-sm font-normal text-gray-500">/mo</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <Button
                    className="w-full"
                    variant={isTrialing ? "default" : "outline"}
                    onClick={() => handleUpgrade(key)}
                    disabled={loading === key}
                  >
                    {loading === key
                      ? "Redirecting…"
                      : isActive
                      ? "Switch Plan"
                      : "Start Plan"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
