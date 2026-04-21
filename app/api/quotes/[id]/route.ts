import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "DECLINED"]).optional(),
  notes: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;

  const quote = await prisma.quote.findFirst({
    where: { id, userId: user.id },
    include: { job: true, customer: true },
  });

  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(quote);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;

  const existing = await prisma.quote.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const data = parsed.data;
  const updateData: any = { ...data };

  if (data.validUntil !== undefined) {
    updateData.validUntil = data.validUntil ? new Date(data.validUntil) : null;
  }

  if (data.status === "SENT" && existing.status === "DRAFT") {
    updateData.sentAt = new Date();
  }

  if (data.status === "ACCEPTED" && existing.status !== "ACCEPTED") {
    updateData.acceptedAt = new Date();
  }

  const quote = await prisma.quote.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(quote);
}
