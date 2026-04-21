import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "./onboarding-wizard";
import { prisma } from "@/lib/prisma";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (user?.onboardingComplete) redirect("/dashboard");

  return <OnboardingWizard clerkId={userId} existingUser={user} />;
}
