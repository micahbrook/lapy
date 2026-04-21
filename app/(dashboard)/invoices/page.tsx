import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatAUD, formatDate, daysOverdue } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Receipt, AlertCircle } from "lucide-react";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/onboarding");

  const params = await searchParams;
  const statusFilter = params.status as any;

  const invoices = await prisma.invoice.findMany({
    where: {
      userId: user.id,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: { job: { include: { customer: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Aging summary
  const outstanding = invoices.filter((i) => ["SENT", "OVERDUE"].includes(i.status));
  const total30 = outstanding.filter((i) => i.dueDate && daysOverdue(i.dueDate) <= 30).reduce((s, i) => s + Number(i.total), 0);
  const total60 = outstanding.filter((i) => i.dueDate && daysOverdue(i.dueDate) > 30 && daysOverdue(i.dueDate) <= 60).reduce((s, i) => s + Number(i.total), 0);
  const total90 = outstanding.filter((i) => i.dueDate && daysOverdue(i.dueDate) > 60).reduce((s, i) => s + Number(i.total), 0);

  const statusColors: Record<string, any> = {
    DRAFT: "secondary",
    SENT: "info",
    PAID: "success",
    OVERDUE: "destructive",
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Link>
        </Button>
      </div>

      {/* Aging Summary */}
      {(total30 + total60 + total90) > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
            <p className="text-xs text-yellow-700 font-medium">0-30 days</p>
            <p className="font-bold text-yellow-800 mt-1">{formatAUD(total30)}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <p className="text-xs text-orange-700 font-medium">31-60 days</p>
            <p className="font-bold text-orange-800 mt-1">{formatAUD(total60)}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p className="text-xs text-red-700 font-medium">60+ days</p>
            <p className="font-bold text-red-800 mt-1">{formatAUD(total90)}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {["All", "DRAFT", "SENT", "PAID", "OVERDUE"].map((tab) => (
          <Link
            key={tab}
            href={tab === "All" ? "/invoices" : `/invoices?status=${tab}`}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              (tab === "All" && !statusFilter) || statusFilter === tab
                ? "bg-orange-500 text-white"
                : "bg-white text-gray-600 border hover:bg-gray-50"
            }`}
          >
            {tab}
          </Link>
        ))}
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="text-lg font-semibold">No invoices yet</h3>
          <Button asChild className="mt-4">
            <Link href="/invoices/new"><Plus className="w-4 h-4 mr-2" />Create Invoice</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const overdue = inv.status === "OVERDUE" || (inv.status === "SENT" && inv.dueDate && new Date(inv.dueDate) < new Date());
            const days = inv.dueDate ? daysOverdue(inv.dueDate) : 0;
            return (
              <Link key={inv.id} href={`/invoices/${inv.id}`}>
                <Card className={`hover:shadow-md transition-shadow cursor-pointer ${overdue ? "border-red-200" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{inv.invoiceNumber}</span>
                          <Badge variant={statusColors[inv.status]}>{inv.status}</Badge>
                          {overdue && days > 0 && (
                            <span className="flex items-center gap-1 text-xs text-red-600">
                              <AlertCircle className="w-3 h-3" />
                              {days}d overdue
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {inv.job?.customer?.name ?? "No customer"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {inv.dueDate ? `Due ${formatDate(inv.dueDate)}` : formatDate(inv.createdAt)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-gray-900">{formatAUD(Number(inv.total))}</p>
                        <p className="text-xs text-gray-400">inc. GST</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
