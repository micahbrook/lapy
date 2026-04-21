import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./dashboard-client";
import { startOfDay, endOfDay, subDays } from "date-fns";

async function getDashboardData(userId: string) {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const thirtyDaysAgo = subDays(today, 30);

  const [
    user,
    todayJobs,
    outstandingInvoices,
    pendingQuotes,
    overdueInvoices,
    recentActivity,
    revenueData,
    upcomingJobs,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { clerkId: userId } }),
    prisma.job.findMany({
      where: {
        userId: (await prisma.user.findUnique({ where: { clerkId: userId } }))?.id ?? "",
        scheduledAt: { gte: todayStart, lte: todayEnd },
      },
      include: { customer: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.invoice.aggregate({
      where: {
        user: { clerkId: userId },
        status: { in: ["SENT", "OVERDUE"] },
      },
      _sum: { total: true },
      _count: true,
    }),
    prisma.quote.count({
      where: {
        user: { clerkId: userId },
        status: "SENT",
      },
    }),
    prisma.invoice.findMany({
      where: {
        user: { clerkId: userId },
        status: "OVERDUE",
      },
      include: { job: { include: { customer: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.jobTimeline.findMany({
      where: { job: { user: { clerkId: userId } } },
      include: { job: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.invoice.findMany({
      where: {
        user: { clerkId: userId },
        status: "PAID",
        paidAt: { gte: thirtyDaysAgo },
      },
      select: { paidAt: true, total: true },
    }),
    prisma.job.findMany({
      where: {
        user: { clerkId: userId },
        scheduledAt: { gte: today },
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      },
      include: { customer: true },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
  ]);

  return {
    user,
    todayJobs,
    outstandingAmount: Number(outstandingInvoices._sum.total ?? 0),
    outstandingCount: outstandingInvoices._count,
    pendingQuotes,
    overdueInvoices,
    recentActivity,
    revenueData,
    upcomingJobs,
  };
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!dbUser) redirect("/onboarding");
  if (!dbUser.onboardingComplete) redirect("/onboarding");

  const data = await getDashboardData(userId);

  return <DashboardClient data={data} />;
}
