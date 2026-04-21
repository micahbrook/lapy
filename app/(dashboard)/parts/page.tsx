import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatAUD } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { PartsClient } from "./parts-client";

export default async function PartsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/onboarding");

  const parts = await prisma.part.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return <PartsClient userId={user.id} initialParts={parts} />;
}
