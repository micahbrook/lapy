import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InvoiceForm } from "../invoice-form";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string; quoteId?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/onboarding");

  const params = await searchParams;

  const [customers, jobs, invoiceCount, prefillJob] = await Promise.all([
    prisma.customer.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    }),
    prisma.job.findMany({
      where: { userId: user.id },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.count({ where: { userId: user.id } }),
    params.jobId
      ? prisma.job.findFirst({
          where: { id: params.jobId, userId: user.id },
          include: { customer: true },
        })
      : null,
  ]);

  return (
    <InvoiceForm
      user={user}
      customers={customers}
      jobs={jobs}
      invoiceCount={invoiceCount + 1}
      prefillJobId={params.jobId}
      prefillJob={prefillJob}
    />
  );
}
