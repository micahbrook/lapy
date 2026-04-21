import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SwmsForm } from "../swms-form";

export default async function NewSwmsPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; job?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/onboarding");

  const params = await searchParams;

  let templateData = null;
  if (params.template) {
    templateData = await prisma.swms.findFirst({
      where: { id: params.template, userId: user.id },
    });
  }

  let jobData = null;
  if (params.job) {
    jobData = await prisma.job.findFirst({
      where: { id: params.job, userId: user.id },
      include: { customer: true },
    });
  }

  const jobs = await prisma.job.findMany({
    where: { userId: user.id, status: { in: ["SCHEDULED", "IN_PROGRESS", "ENQUIRY"] } },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Count existing SWMS for numbering
  const swmsCount = await prisma.swms.count({ where: { userId: user.id } });

  return (
    <SwmsForm
      user={user}
      jobs={jobs}
      swmsCount={swmsCount + 1}
      templateData={templateData}
      prefillJob={jobData}
    />
  );
}
