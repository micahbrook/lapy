"use client";

import Link from "next/link";
import { format, subDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Briefcase,
  DollarSign,
  FileText,
  AlertCircle,
  Plus,
  ShieldCheck,
  Users,
  Send,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatAUD, formatDateTime } from "@/lib/utils";

interface DashboardClientProps {
  data: {
    user: any;
    todayJobs: any[];
    outstandingAmount: number;
    outstandingCount: number;
    pendingQuotes: number;
    overdueInvoices: any[];
    recentActivity: any[];
    revenueData: any[];
    upcomingJobs: any[];
  };
}

function buildRevenueChart(invoices: any[]) {
  const days: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = format(subDays(new Date(), i), "MMM d");
    days[d] = 0;
  }
  invoices.forEach((inv) => {
    if (inv.paidAt) {
      const d = format(new Date(inv.paidAt), "MMM d");
      if (d in days) days[d] += Number(inv.total);
    }
  });
  return Object.entries(days).map(([date, amount]) => ({ date, amount }));
}

export function DashboardClient({ data }: DashboardClientProps) {
  const chartData = buildRevenueChart(data.revenueData);
  const businessName = data.user?.businessName ?? "Your Business";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {data.user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">{businessName} · {format(new Date(), "EEEE, d MMMM yyyy")}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Button asChild className="h-14 flex-col gap-1 text-xs">
          <Link href="/quotes/new">
            <Plus className="w-5 h-5" />
            New Quote
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-14 flex-col gap-1 text-xs">
          <Link href="/jobs/new">
            <Briefcase className="w-5 h-5" />
            New Job
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-14 flex-col gap-1 text-xs">
          <Link href="/swms/new">
            <ShieldCheck className="w-5 h-5" />
            Generate SWMS
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-14 flex-col gap-1 text-xs">
          <Link href="/customers/new">
            <Users className="w-5 h-5" />
            Add Customer
          </Link>
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Today's Jobs</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{data.todayJobs.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Outstanding</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatAUD(data.outstandingAmount)}</p>
                <p className="text-xs text-gray-400">{data.outstandingCount} invoice{data.outstandingCount !== 1 ? "s" : ""}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Awaiting Acceptance</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{data.pendingQuotes}</p>
                <p className="text-xs text-gray-400">quotes sent</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Overdue</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{data.overdueInvoices.length}</p>
                <p className="text-xs text-gray-400">invoices</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue — Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  interval={6}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value) => [formatAUD(Number(value)), "Revenue"]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="amount" fill="#f97316" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Today's Schedule</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/schedule">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.todayJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No jobs scheduled today</p>
                <Button asChild size="sm" className="mt-3">
                  <Link href="/jobs/new">Schedule a job</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {data.todayJobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="text-center min-w-[50px]">
                        <p className="text-sm font-semibold text-orange-500">
                          {job.scheduledAt ? format(new Date(job.scheduledAt), "h:mm") : "—"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {job.scheduledAt ? format(new Date(job.scheduledAt), "a") : ""}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{job.title}</p>
                        <p className="text-xs text-gray-500 truncate">{job.customer?.name ?? "No customer"}</p>
                        {job.address && (
                          <p className="text-xs text-gray-400 truncate">{job.address}</p>
                        )}
                      </div>
                      <JobStatusBadge status={job.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Invoices */}
      {data.overdueInvoices.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Overdue Invoices
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/invoices?status=OVERDUE">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.overdueInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {inv.job?.customer?.name ?? "Unknown Customer"}
                    </p>
                    <p className="text-xs text-gray-500">{inv.invoiceNumber} · Due {format(new Date(inv.dueDate), "d MMM")}</p>
                  </div>
                  <p className="font-semibold text-red-600 shrink-0">{formatAUD(Number(inv.total))}</p>
                  <Button size="sm" variant="outline" className="shrink-0 h-8 text-xs">
                    <Send className="w-3 h-3 mr-1" />
                    Chase
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {data.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentActivity.slice(0, 6).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{activity.event}</p>
                    {activity.job && (
                      <p className="text-xs text-gray-500 truncate">
                        {activity.job.title} · {activity.job.customer?.name}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 shrink-0">
                    {formatDateTime(activity.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: any }> = {
    ENQUIRY: { label: "Enquiry", variant: "outline" },
    QUOTED: { label: "Quoted", variant: "info" },
    SCHEDULED: { label: "Scheduled", variant: "info" },
    IN_PROGRESS: { label: "In Progress", variant: "warning" },
    COMPLETED: { label: "Completed", variant: "success" },
    INVOICED: { label: "Invoiced", variant: "secondary" },
    PAID: { label: "Paid", variant: "success" },
  };
  const { label, variant } = map[status] ?? { label: status, variant: "outline" };
  return <Badge variant={variant} className="text-xs shrink-0">{label}</Badge>;
}
