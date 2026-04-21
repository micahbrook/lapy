import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { QuoteForm } from "../quote-form";

export default async function NewQuotePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/onboarding");

  const customers = await prisma.customer.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  const quoteCount = await prisma.quote.count({ where: { userId: user.id } });

  return <QuoteForm user={user} customers={customers} quoteCount={quoteCount + 1} />;
}
