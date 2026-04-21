import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JobForm } from "../job-form";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/onboarding");

  const params = await searchParams;

  const customers = await prisma.customer.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return (
    <JobForm
      user={user}
      customers={customers}
      prefillData={params.customerId ? { customerId: params.customerId } : undefined}
    />
  );
}
