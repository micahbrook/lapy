import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime, formatAUD } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Phone,
  Mail,
  Plus,
  FileText,
  ShieldCheck,
  Receipt,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { JobActions } from "./job-actions";

const STATUS_COLORS: Record<string, any> = {
  ENQUIRY: "outline",
  QUOTED: "info",
  SCHEDULED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  INVOICED: "secondary",
  PAID: "success",
};

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/onboarding");

  const { id } = await params;

  const job = await prisma.job.findFirst({
    where: { id, userId: user.id },
    include: {
      customer: true,
      quotes: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      swms: { orderBy: { createdAt: "desc" } },
      jobParts: true,
      timeline: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!job) notFound();

  const googleMapsUrl = job.address
    ? `https://maps.google.com/?q=${encodeURIComponent(job.address + " " + (job.suburb ?? "") + " " + (job.state ?? ""))}`
    : null;

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/jobs"><ArrowLeft className="w-4 h-4 mr-1" />Jobs</Link>
          </Button>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            {job.customer && (
              <p className="text-gray-500 mt-1">{job.customer.name}</p>
            )}
          </div>
          <Badge variant={STATUS_COLORS[job.status]} className="text-sm px-3 py-1">
            {job.status.replace("_", " ")}
          </Badge>
        </div>
        {job.scheduledAt && (
          <p className="text-sm text-orange-600 font-medium mt-2">
            Scheduled: {formatDateTime(job.scheduledAt)}
          </p>
        )}
        <div className="mt-4">
          <JobActions jobId={job.id} currentStatus={job.status} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <Button asChild variant="outline" size="sm" className="flex-col h-14 gap-1 text-xs">
          <Link href={`/quotes/new?job=${job.id}`}>
            <FileText className="w-4 h-4" />
            Quote
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="flex-col h-14 gap-1 text-xs">
          <Link href={`/swms/new?job=${job.id}`}>
            <ShieldCheck className="w-4 h-4" />
            SWMS
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="flex-col h-14 gap-1 text-xs">
          <Link href={`/invoices/new?job=${job.id}`}>
            <Receipt className="w-4 h-4" />
            Invoice
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quotes">Quotes ({job.quotes.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({job.invoices.length})</TabsTrigger>
          <TabsTrigger value="swms">SWMS ({job.swms.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {job.customer && (
            <Card>
              <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{job.customer.name}</p>
                {job.customer.phone && (
                  <a href={`tel:${job.customer.phone}`} className="flex items-center gap-2 text-sm text-blue-600">
                    <Phone className="w-4 h-4" />
                    {job.customer.phone}
                  </a>
                )}
                {job.customer.email && (
                  <a href={`mailto:${job.customer.email}`} className="flex items-center gap-2 text-sm text-blue-600">
                    <Mail className="w-4 h-4" />
                    {job.customer.email}
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {job.address && (
            <Card>
              <CardHeader><CardTitle className="text-base">Site Location</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{job.address}</p>
                {job.suburb && <p className="text-sm text-gray-500">{job.suburb} {job.state}</p>}
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-600 mt-2"
                  >
                    <MapPin className="w-4 h-4" />
                    Open in Maps
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {job.description && (
            <Card>
              <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.description}</p>
              </CardContent>
            </Card>
          )}

          {job.totalAmount && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Job Value</span>
                  <span className="text-xl font-bold text-orange-600">{formatAUD(Number(job.totalAmount))}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="quotes" className="mt-4 space-y-3">
          {job.quotes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No quotes for this job</p>
              <Button asChild size="sm" className="mt-3">
                <Link href={`/quotes/new?job=${job.id}`}><Plus className="w-4 h-4 mr-1" />Create Quote</Link>
              </Button>
            </div>
          ) : (
            job.quotes.map((quote) => (
              <Link key={quote.id} href={`/quotes/${quote.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{quote.quoteNumber}</p>
                      <p className="text-sm text-gray-500">{formatDate(quote.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatAUD(Number(quote.total))}</p>
                      <Badge variant="outline" className="text-xs">{quote.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="invoices" className="mt-4 space-y-3">
          {job.invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No invoices for this job</p>
              <Button asChild size="sm" className="mt-3">
                <Link href={`/invoices/new?job=${job.id}`}><Plus className="w-4 h-4 mr-1" />Create Invoice</Link>
              </Button>
            </div>
          ) : (
            job.invoices.map((inv) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{inv.invoiceNumber}</p>
                      <p className="text-sm text-gray-500">{formatDate(inv.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatAUD(Number(inv.total))}</p>
                      <Badge variant="outline" className="text-xs">{inv.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="swms" className="mt-4 space-y-3">
          {job.swms.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No SWMS for this job</p>
              <Button asChild size="sm" className="mt-3">
                <Link href={`/swms/new?job=${job.id}`}><Plus className="w-4 h-4 mr-1" />Generate SWMS</Link>
              </Button>
            </div>
          ) : (
            job.swms.map((s) => (
              <Link key={s.id} href={`/swms/${s.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{s.swmsNumber}</p>
                      <p className="text-sm text-gray-500">{formatDate(s.createdAt)}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{s.status}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {job.timeline.length === 0 ? (
                <p className="text-center text-gray-400 py-4">No activity yet</p>
              ) : (
                <div className="space-y-4">
                  {job.timeline.map((entry) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-orange-400 mt-2 shrink-0" />
                      <div>
                        <p className="text-sm text-gray-800">{entry.event}</p>
                        {entry.detail && <p className="text-xs text-gray-500 mt-0.5">{entry.detail}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(entry.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
