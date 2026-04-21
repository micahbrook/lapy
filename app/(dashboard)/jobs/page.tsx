import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Briefcase } from "lucide-react";

const JOB_STATUSES = ["ENQUIRY", "QUOTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "INVOICED", "PAID"];

const STATUS_COLORS: Record<string, any> = {
  ENQUIRY: "outline",
  QUOTED: "info",
  SCHEDULED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  INVOICED: "secondary",
  PAID: "success",
};

const STATUS_LABELS: Record<string, string> = {
  ENQUIRY: "Enquiry",
  QUOTED: "Quoted",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  INVOICED: "Invoiced",
  PAID: "Paid",
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; view?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/onboarding");

  const params = await searchParams;
  const statusFilter = params.status as any;

  const jobs = await prisma.job.findMany({
    where: {
      userId: user.id,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <Button asChild>
          <Link href="/jobs/new">
            <Plus className="w-4 h-4 mr-2" />
            New Job
          </Link>
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <Link
          href="/jobs"
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            !statusFilter ? "bg-orange-500 text-white" : "bg-white text-gray-600 border hover:bg-gray-50"
          }`}
        >
          All
        </Link>
        {JOB_STATUSES.map((status) => (
          <Link
            key={status}
            href={`/jobs?status=${status}`}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === status ? "bg-orange-500 text-white" : "bg-white text-gray-600 border hover:bg-gray-50"
            }`}
          >
            {STATUS_LABELS[status]}
          </Link>
        ))}
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No jobs yet</h3>
          <p className="text-gray-500 mt-2">Create your first job to get started.</p>
          <Button asChild className="mt-4">
            <Link href="/jobs/new"><Plus className="w-4 h-4 mr-2" />Create Job</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 truncate">{job.title}</span>
                        <Badge variant={STATUS_COLORS[job.status]}>{STATUS_LABELS[job.status]}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{job.customer?.name ?? "No customer"}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {job.address && <p className="text-xs text-gray-400 truncate">{job.address}</p>}
                        {job.scheduledAt && (
                          <p className="text-xs text-orange-500 font-medium">
                            {formatDate(job.scheduledAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    {job.totalAmount && (
                      <p className="font-semibold text-gray-700 shrink-0">
                        ${Number(job.totalAmount).toLocaleString("en-AU")}
                      </p>
                    )}
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
