import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatAUD, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Phone, Mail, Receipt } from "lucide-react";
import { QuoteActions } from "./quote-actions";

const STATUS_COLORS: Record<string, any> = {
  DRAFT: "secondary",
  SENT: "info",
  ACCEPTED: "success",
  DECLINED: "destructive",
};

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/onboarding");

  const { id } = await params;

  const quote = await prisma.quote.findFirst({
    where: { id, userId: user.id },
    include: { job: true, customer: true, invoices: true },
  });

  if (!quote) notFound();

  const lineItems = quote.lineItems as any[];
  const customer = quote.customer;

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/quotes">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quotes
            </Link>
          </Button>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {quote.quoteNumber}
            </h1>
            {customer && (
              <p className="text-gray-500 mt-1">{customer.name}</p>
            )}
            {quote.job && (
              <Link
                href={`/jobs/${quote.job.id}`}
                className="text-sm text-blue-600 hover:underline mt-0.5 block"
              >
                {quote.job.title}
              </Link>
            )}
          </div>
          <Badge variant={STATUS_COLORS[quote.status]} className="text-sm px-3 py-1">
            {quote.status}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <QuoteActions quote={quote} />

      <div className="mt-6 space-y-4">
        {/* Customer */}
        {customer && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <p className="font-medium">{customer.name}</p>
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
            </CardContent>
          </Card>
        )}

        {/* Dates */}
        <Card>
          <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Created</p>
              <p className="text-sm font-medium mt-1">{formatDate(quote.createdAt)}</p>
            </div>
            {quote.sentAt && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Sent</p>
                <p className="text-sm font-medium mt-1">{formatDate(quote.sentAt)}</p>
              </div>
            )}
            {quote.validUntil && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Valid Until</p>
                <p className="text-sm font-medium mt-1">{formatDate(quote.validUntil)}</p>
              </div>
            )}
            {quote.acceptedAt && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Accepted</p>
                <p className="text-sm font-medium mt-1 text-green-600">
                  {formatDate(quote.acceptedAt)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium uppercase mb-2 px-1">
              <span className="col-span-6">Description</span>
              <span className="col-span-2 text-right">Qty</span>
              <span className="col-span-2 text-right">Unit Price</span>
              <span className="col-span-2 text-right">Total</span>
            </div>
            <div className="space-y-2">
              {lineItems.map((item: any, i: number) => (
                <div
                  key={item.id ?? i}
                  className="grid grid-cols-12 gap-2 py-2 border-b last:border-0 text-sm"
                >
                  <div className="col-span-12 sm:col-span-6">
                    <p className="font-medium">{item.description}</p>
                    {item.includeGst && (
                      <span className="text-xs text-gray-400">inc. GST</span>
                    )}
                  </div>
                  <div className="col-span-4 sm:col-span-2 text-right text-gray-600">
                    {item.quantity} {item.unit}
                  </div>
                  <div className="col-span-4 sm:col-span-2 text-right text-gray-600">
                    {formatAUD(item.unitPrice)}
                  </div>
                  <div className="col-span-4 sm:col-span-2 text-right font-medium">
                    {formatAUD(item.total)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatAUD(Number(quote.subtotal))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST (10%)</span>
                <span>{formatAUD(Number(quote.gst))}</span>
              </div>
              <div className="flex justify-between font-bold text-xl border-t pt-2">
                <span>Total</span>
                <span className="text-orange-600">
                  {formatAUD(Number(quote.total))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {quote.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {quote.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Convert to Invoice */}
        {quote.status === "ACCEPTED" && quote.invoices.length === 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4 flex items-center justify-between">
              <p className="text-sm font-medium text-green-800">
                Quote accepted — ready to invoice
              </p>
              <Button asChild size="sm">
                <Link href={`/invoices/new?quoteId=${quote.id}&jobId=${quote.jobId ?? ""}`}>
                  <Receipt className="w-4 h-4 mr-2" />
                  Create Invoice
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
