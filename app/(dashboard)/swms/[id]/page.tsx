import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ShieldCheck, AlertTriangle, CheckCircle } from "lucide-react";
import { SwmsActions } from "./swms-actions";

const STATUS_COLORS: Record<string, any> = {
  DRAFT: "secondary",
  SIGNED: "success",
  ARCHIVED: "outline",
};

const RISK_COLORS: Record<string, string> = {
  High: "text-red-600 bg-red-50 border-red-200",
  Medium: "text-yellow-700 bg-yellow-50 border-yellow-200",
  Low: "text-green-600 bg-green-50 border-green-200",
};

export default async function SwmsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/onboarding");

  const { id } = await params;

  const swms = await prisma.swms.findFirst({
    where: { id, userId: user.id },
    include: { job: { include: { customer: true } } },
  });

  if (!swms) notFound();

  const hazards = swms.hazards as any[];
  const ppe = (swms.ppe as any[]).filter((p) => p.required);

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/swms">
              <ArrowLeft className="w-4 h-4 mr-1" />
              SWMS
            </Link>
          </Button>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-orange-500" />
              {swms.swmsNumber}
            </h1>
            {swms.job?.customer && (
              <p className="text-gray-500 mt-1">{swms.job.customer.name}</p>
            )}
            {swms.job && (
              <Link
                href={`/jobs/${swms.job.id}`}
                className="text-sm text-blue-600 hover:underline mt-0.5 block"
              >
                {swms.job.title}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            {swms.highRiskWork && (
              <Badge variant="destructive">HRCW</Badge>
            )}
            <Badge variant={STATUS_COLORS[swms.status]} className="text-sm px-3 py-1">
              {swms.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Actions */}
      <SwmsActions swms={swms} />

      <div className="mt-6 space-y-4">
        {/* Overview */}
        <Card>
          <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Created</p>
              <p className="font-medium mt-1">{formatDate(swms.createdAt)}</p>
            </div>
            {swms.siteAddress && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Site</p>
                <p className="font-medium mt-1">{swms.siteAddress}</p>
              </div>
            )}
            {swms.principalContractor && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Principal Contractor</p>
                <p className="font-medium mt-1">{swms.principalContractor}</p>
              </div>
            )}
            {swms.signedAt && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Signed</p>
                <p className="font-medium mt-1 text-green-600">{formatDateTime(swms.signedAt)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job Description */}
        {swms.jobDescription && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {swms.jobDescription}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Scope of Work */}
        {swms.scopeOfWork && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scope of Work</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {swms.scopeOfWork}
              </p>
            </CardContent>
          </Card>
        )}

        {/* HRCW */}
        {swms.highRiskWork && swms.highRiskCategories.length > 0 && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                High Risk Construction Work
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {swms.highRiskCategories.map((cat: string) => (
                  <li key={cat} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    {cat}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Hazard Register */}
        {hazards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Hazard Register ({hazards.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hazards.map((hazard: any, i: number) => (
                <div key={hazard.id ?? i} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{hazard.hazard}</p>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded border ${RISK_COLORS[hazard.initialRisk] ?? ""}`}
                    >
                      {hazard.initialRisk}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">Likelihood:</span> {hazard.likelihood}
                    </div>
                    <div>
                      <span className="font-medium">Consequence:</span> {hazard.consequence}
                    </div>
                    <div>
                      <span className="font-medium">Residual:</span>{" "}
                      <span className={`font-medium ${hazard.residualRisk === "Low" ? "text-green-600" : hazard.residualRisk === "Medium" ? "text-yellow-600" : "text-red-600"}`}>
                        {hazard.residualRisk}
                      </span>
                    </div>
                  </div>
                  {hazard.controls?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                        Controls
                      </p>
                      <ul className="space-y-0.5">
                        {(hazard.controls as string[]).filter(Boolean).map((c, ci) => (
                          <li key={ci} className="text-sm text-gray-700 flex items-start gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {hazard.responsiblePerson && (
                    <p className="text-xs text-gray-500">
                      Responsible: <span className="font-medium">{hazard.responsiblePerson}</span>
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* PPE */}
        {ppe.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Required PPE</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ppe.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 border border-orange-200"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-xs font-medium text-gray-800">{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Emergency */}
        {(swms.emergencyProcedures || swms.nearestHospital) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Emergency Procedures</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {swms.emergencyProcedures && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {swms.emergencyProcedures}
                </p>
              )}
              {swms.nearestHospital && (
                <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm">
                  <span className="font-medium text-blue-800">Nearest Hospital: </span>
                  <span className="text-blue-700">{swms.nearestHospital}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
