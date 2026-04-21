import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatAUD, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Phone, Mail, MapPin } from "lucide-react";
import { InvoiceActions } from "./invoice-actions";

const STATUS_COLORS: Record<string, any> = {
  DRAFT: "secondary",
  SENT: "info",
  PAID: "success",
  OVERDUE: "destructive",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/onboarding");

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: { job: { include: { customer: true } }, quote: true },
  });

  if (!invoice) notFound();

  const lineItems = invoice.lineItems as any[];
  const customer = invoice.job?.customer;

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/invoices">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Invoices
            </Link>
          </Button>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {invoice.invoiceNumber}
            </h1>
            {customer && (
              <p className="text-gray-500 mt-1">{customer.name}</p>
            )}
            {invoice.job && (
              <Link
                href={`/jobs/${invoice.job.id}`}
                className="text-sm text-blue-600 hover:underline mt-0.5 block"
              >
                {invoice.job.title}
              </Link>
            )}
          </div>
          <Badge variant={STATUS_COLORS[invoice.status]} className="text-sm px-3 py-1">
            {invoice.status}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <InvoiceActions invoice={invoice} />

      <div className="mt-6 space-y-4">
        {/* Customer */}
        {customer && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bill To</CardTitle>
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
              {customer.suburb && (
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  {customer.suburb}
                  {customer.state ? `, ${customer.state}` : ""}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dates */}
        <Card>
          <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Issued</p>
              <p className="text-sm font-medium mt-1">{formatDate(invoice.createdAt)}</p>
            </div>
            {invoice.dueDate && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Due</p>
                <p className="text-sm font-medium mt-1">{formatDate(invoice.dueDate)}</p>
              </div>
            )}
            {invoice.paidAt && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Paid</p>
                <p className="text-sm font-medium mt-1 text-green-600">
                  {formatDate(invoice.paidAt)}
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
                <span>{formatAUD(Number(invoice.subtotal))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST (10%)</span>
                <span>{formatAUD(Number(invoice.gst))}</span>
              </div>
              {invoice.depositAmount && Number(invoice.depositAmount) > 0 && (
                <div className="flex justify-between text-sm text-blue-600">
                  <span>Deposit Required</span>
                  <span>{formatAUD(Number(invoice.depositAmount))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xl border-t pt-2">
                <span>Total</span>
                <span className="text-orange-600">
                  {formatAUD(Number(invoice.total))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        {(user.bankBsb || user.bankAccount) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1 text-gray-700">
              {user.bankName && <p>{user.bankName}</p>}
              {user.bankBsb && <p>BSB: {user.bankBsb}</p>}
              {user.bankAccount && <p>Account: {user.bankAccount}</p>}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {invoice.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {invoice.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Paid reference */}
        {invoice.paidReference && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">Payment reference</p>
              <p className="font-medium">{invoice.paidReference}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
