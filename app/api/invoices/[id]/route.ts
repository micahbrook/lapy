import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE"]).optional(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  depositAmount: z.number().optional().nullable(),
  paidReference: z.string().optional().nullable(),
  lineItems: z.array(z.any()).optional(),
  subtotal: z.number().optional(),
  gst: z.number().optional(),
  total: z.number().optional(),
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

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: { job: { include: { customer: true } }, quote: true },
  });

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(invoice);
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

  const existing = await prisma.invoice.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const data = parsed.data;

  const updateData: any = { ...data };

  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }

  if (data.status === "PAID") {
    updateData.paidAt = new Date();
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: updateData,
    include: { job: { include: { customer: true } }, quote: true },
  });

  return NextResponse.json(invoice);
}
