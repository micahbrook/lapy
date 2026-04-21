import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatAUD, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Phone, Mail, MapPin, Plus, Briefcase } from "lucide-react";

const JOB_STATUS_COLORS: Record<string, any> = {
  ENQUIRY: "outline",
  QUOTED: "info",
  SCHEDULED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  INVOICED: "secondary",
  PAID: "success",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/onboarding");

  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, userId: user.id },
    include: {
      jobs: {
        include: {
          invoices: { select: { id: true, invoiceNumber: true, total: true, status: true } },
          quotes: { select: { id: true, quoteNumber: true, total: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) notFound();

  const totalInvoiced = customer.jobs
    .flatMap((j: any) => j.invoices)
    .filter((i: any) => ["SENT", "PAID", "OVERDUE"].includes(i.status))
    .reduce((sum: any, i: any) => sum + Number(i.total), 0);

  const totalPaid = customer.jobs
    .flatMap((j: any) => j.invoices)
    .filter((i: any) => i.status === "PAID")
    .reduce((sum: any, i: any) => sum + Number(i.total), 0);

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/customers">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Customers
            </Link>
          </Button>
        </div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
          <Button asChild size="sm">
            <Link href={`/jobs/new?customerId=${customer.id}`}>
              <Plus className="w-4 h-4 mr-1" />
              New Job
            </Link>
          </Button>
        </div>
      </div>

      {/* Contact Info */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="flex items-center gap-2 text-sm text-blue-600"
            >
              <Phone className="w-4 h-4" />
              {customer.phone}
            </a>
          )}
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="flex items-center gap-2 text-sm text-blue-600"
            >
              <Mail className="w-4 h-4" />
              {customer.email}
            </a>
          )}
          {customer.address && (
            <p className="flex items-start gap-2 text-sm text-gray-700">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {customer.address}
                {customer.suburb ? `, ${customer.suburb}` : ""}
                {customer.state ? ` ${customer.state}` : ""}
                {customer.postcode ? ` ${customer.postcode}` : ""}
              </span>
            </p>
          )}
          {customer.notes && (
            <p className="text-sm text-gray-500 pt-1 border-t">{customer.notes}</p>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{customer.jobs.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-lg font-bold text-gray-900">{formatAUD(totalInvoiced)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Invoiced</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-lg font-bold text-green-600">{formatAUD(totalPaid)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-orange-500" />
            Jobs
          </h2>
        </div>

        {customer.jobs.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-gray-400">
              <p>No jobs yet for this customer</p>
              <Button asChild size="sm" className="mt-3">
                <Link href={`/jobs/new?customerId=${customer.id}`}>
                  <Plus className="w-4 h-4 mr-1" />
                  Create First Job
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {customer.jobs.map((job: any) => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{job.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(job.createdAt)}
                          {job.scheduledAt
                            ? ` · Scheduled ${formatDate(job.scheduledAt)}`
                            : ""}
                        </p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {job.quotes.map((q) => (
                            <span
                              key={q.id}
                              className="text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5"
                            >
                              {q.quoteNumber}
                            </span>
                          ))}
                          {job.invoices.map((i) => (
                            <span
                              key={i.id}
                              className="text-xs text-blue-700 bg-blue-50 rounded px-1.5 py-0.5"
                            >
                              {i.invoiceNumber}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge variant={JOB_STATUS_COLORS[job.status]} className="text-xs">
                          {job.status.replace("_", " ")}
                        </Badge>
                        {job.totalAmount && (
                          <span className="text-sm font-semibold text-gray-700">
                            {formatAUD(Number(job.totalAmount))}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
