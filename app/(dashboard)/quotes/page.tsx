import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatAUD, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FileText } from "lucide-react";

export default async function QuotesPage({
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

  const quotes = await prisma.quote.findMany({
    where: {
      userId: user.id,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: {
      customer: true,
      job: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const statusColors: Record<string, any> = {
    DRAFT: "secondary",
    SENT: "info",
    ACCEPTED: "success",
    DECLINED: "destructive",
  };

  const statusTabs = ["All", "DRAFT", "SENT", "ACCEPTED", "DECLINED"];

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
        <Button asChild>
          <Link href="/quotes/new">
            <Plus className="w-4 h-4 mr-2" />
            New Quote
          </Link>
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {statusTabs.map((tab) => (
          <Link
            key={tab}
            href={tab === "All" ? "/quotes" : `/quotes?status=${tab}`}
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

      {quotes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No quotes yet</h3>
          <p className="text-gray-500 mt-2">Create your first quote with AI-powered line item generation.</p>
          <Button asChild className="mt-4">
            <Link href="/quotes/new"><Plus className="w-4 h-4 mr-2" />Create Quote</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map((quote) => (
            <Link key={quote.id} href={`/quotes/${quote.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{quote.quoteNumber}</span>
                        <Badge variant={statusColors[quote.status]}>{quote.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {quote.customer?.name ?? "No customer"} · {quote.job?.title ?? "No job"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(quote.createdAt)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">{formatAUD(Number(quote.total))}</p>
                      <p className="text-xs text-gray-400">inc. GST</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
