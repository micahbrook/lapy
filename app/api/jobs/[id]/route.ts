import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z
    .enum([
      "ENQUIRY",
      "QUOTED",
      "SCHEDULED",
      "IN_PROGRESS",
      "COMPLETED",
      "INVOICED",
      "PAID",
    ])
    .optional(),
  scheduledAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  totalAmount: z.number().optional().nullable(),
  address: z.string().optional().nullable(),
  suburb: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
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

  const job = await prisma.job.findFirst({
    where: { id, userId: user.id },
    include: {
      customer: true,
      quotes: true,
      invoices: true,
      swms: true,
      timeline: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(job);
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

  const existing = await prisma.job.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const data = parsed.data;
  const updateData: any = { ...data };

  if (data.scheduledAt !== undefined) {
    updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
  }

  const job = await prisma.job.update({ where: { id }, data: updateData });

  if (data.status && data.status !== existing.status) {
    await prisma.jobTimeline.create({
      data: {
        jobId: id,
        event: `Status changed to ${data.status.replace("_", " ")}`,
      },
    });
  }

  return NextResponse.json(job);
}
