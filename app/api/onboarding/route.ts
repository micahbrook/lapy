import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string(),
  email: z.string().email(),
  businessName: z.string().optional(),
  abn: z.string().optional(),
  tradeType: z.string().optional(),
  state: z.string().optional(),
  licenceNumber: z.string().optional(),
  phone: z.string().optional(),
  brandColour: z.string().optional(),
  logoUrl: z.string().optional(),
  plan: z.string().optional(),
  complete: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const data = parsed.data;

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    create: {
      clerkId: userId,
      email: data.email,
      name: data.name,
      businessName: data.businessName,
      abn: data.abn,
      tradeType: data.tradeType as any,
      state: data.state as any,
      licenceNumber: data.licenceNumber,
      phone: data.phone,
      brandColour: data.brandColour ?? "#f97316",
      logoUrl: data.logoUrl,
      onboardingComplete: data.complete ?? false,
    },
    update: {
      businessName: data.businessName,
      abn: data.abn,
      tradeType: data.tradeType as any,
      state: data.state as any,
      licenceNumber: data.licenceNumber,
      phone: data.phone,
      brandColour: data.brandColour,
      logoUrl: data.logoUrl,
      onboardingComplete: data.complete ?? false,
    },
  });

  // Create subscription record
  if (data.complete) {
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        plan: (data.plan as any) ?? "SOLO",
        status: "TRIALING",
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      update: {
        plan: (data.plan as any) ?? "SOLO",
      },
    });
  }

  return NextResponse.json({ success: true, userId: user.id });
}
