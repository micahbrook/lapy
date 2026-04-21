import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ShieldCheck, FileDown, Copy } from "lucide-react";

export default async function SwmsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/onboarding");

  const swmsList = await prisma.swms.findMany({
    where: { userId: user.id },
    include: { job: { include: { customer: true } } },
    orderBy: { createdAt: "desc" },
  });

  const statusVariant: Record<string, any> = {
    DRAFT: "warning",
    SIGNED: "success",
    ARCHIVED: "secondary",
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SWMS</h1>
          <p className="text-gray-500 text-sm mt-1">Safe Work Method Statements</p>
        </div>
        <Button asChild>
          <Link href="/swms/new">
            <Plus className="w-4 h-4 mr-2" />
            New SWMS
          </Link>
        </Button>
      </div>

      {swmsList.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No SWMS yet</h3>
          <p className="text-gray-500 mt-2 max-w-sm mx-auto">
            Generate AI-powered Safe Work Method Statements compliant with Australian WHS laws.
          </p>
          <Button asChild className="mt-4">
            <Link href="/swms/new">
              <Plus className="w-4 h-4 mr-2" />
              Generate Your First SWMS
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {swmsList.map((swms) => (
            <Card key={swms.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/swms/${swms.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 truncate">
                        {swms.isTemplate ? `📋 ${swms.templateName}` : swms.swmsNumber}
                      </p>
                      <Badge variant={statusVariant[swms.status]}>{swms.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {swms.job?.title ?? swms.jobDescription ?? "Standalone SWMS"}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">{formatDate(swms.createdAt)}</span>
                      {swms.siteAddress && (
                        <span className="text-xs text-gray-400 truncate">{swms.siteAddress}</span>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    {swms.pdfUrl && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={swms.pdfUrl} target="_blank" rel="noopener noreferrer">
                          <FileDown className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/swms/new?template=${swms.id}`}>
                        <Copy className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
