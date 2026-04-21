import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatAUD, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Calendar, Clock } from "lucide-react";
import { format, isToday, isTomorrow, isThisWeek, startOfDay } from "date-fns";

const STATUS_COLORS: Record<string, any> = {
  SCHEDULED: "info",
  IN_PROGRESS: "warning",
  ENQUIRY: "outline",
  QUOTED: "secondary",
};

export default async function SchedulePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/onboarding");

  const upcomingJobs = await prisma.job.findMany({
    where: {
      userId: user.id,
      status: { in: ["SCHEDULED", "IN_PROGRESS", "ENQUIRY", "QUOTED"] },
      scheduledAt: { gte: startOfDay(new Date()) },
    },
    include: { customer: true },
    orderBy: { scheduledAt: "asc" },
  });

  const unscheduledJobs = await prisma.job.findMany({
    where: {
      userId: user.id,
      status: { in: ["ENQUIRY", "QUOTED"] },
      scheduledAt: null,
    },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  function dayLabel(date: Date) {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isThisWeek(date)) return format(date, "EEEE");
    return format(date, "EEE d MMM");
  }

  // Group by day
  const grouped = upcomingJobs.reduce<Record<string, typeof upcomingJobs>>(
    (acc, job) => {
      const key = job.scheduledAt
        ? format(new Date(job.scheduledAt), "yyyy-MM-dd")
        : "unscheduled";
      acc[key] = [...(acc[key] ?? []), job];
      return acc;
    },
    {}
  );

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-orange-500" />
          Schedule
        </h1>
        <Button asChild>
          <Link href="/jobs/new">
            <Plus className="w-4 h-4 mr-2" />
            New Job
          </Link>
        </Button>
      </div>

      {upcomingJobs.length === 0 && unscheduledJobs.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No upcoming jobs</h3>
          <p className="text-gray-500 mt-2">Schedule your first job to see it here.</p>
          <Button asChild className="mt-4">
            <Link href="/jobs/new">
              <Plus className="w-4 h-4 mr-2" />
              Schedule a Job
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {(Object.entries(grouped) as [string, typeof upcomingJobs][]).map(([dateKey, jobs]) => (
            <div key={dateKey}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                {dayLabel(new Date(dateKey + "T00:00:00"))}
              </h2>
              <div className="space-y-2">
                {jobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="text-center w-12 shrink-0">
                          {job.scheduledAt ? (
                            <>
                              <p className="text-lg font-bold text-orange-500 leading-none">
                                {format(new Date(job.scheduledAt), "h:mm")}
                              </p>
                              <p className="text-xs text-gray-400">
                                {format(new Date(job.scheduledAt), "a")}
                              </p>
                            </>
                          ) : (
                            <Clock className="w-5 h-5 text-gray-300 mx-auto" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {job.title}
                          </p>
                          {job.customer && (
                            <p className="text-sm text-gray-500">{job.customer.name}</p>
                          )}
                          {job.address && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {job.address}
                              {job.suburb ? `, ${job.suburb}` : ""}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant={STATUS_COLORS[job.status] ?? "outline"}>
                            {job.status.replace("_", " ")}
                          </Badge>
                          {job.totalAmount && (
                            <span className="text-sm font-medium text-gray-600">
                              {formatAUD(Number(job.totalAmount))}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {unscheduledJobs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                Unscheduled
              </h2>
              <div className="space-y-2">
                {unscheduledJobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <Card className="hover:shadow-md transition-shadow border-dashed">
                      <CardContent className="p-4 flex items-center gap-4">
                        <Clock className="w-5 h-5 text-gray-300 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{job.title}</p>
                          {job.customer && (
                            <p className="text-sm text-gray-500">{job.customer.name}</p>
                          )}
                        </div>
                        <Badge variant={STATUS_COLORS[job.status] ?? "outline"}>
                          {job.status.replace("_", " ")}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
