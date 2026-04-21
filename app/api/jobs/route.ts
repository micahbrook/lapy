import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  customerId: z.string().optional(),
  jobType: z.string().optional(),
  status: z.enum(["ENQUIRY", "QUOTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "INVOICED", "PAID"]).optional(),
  address: z.string().optional(),
  suburb: z.string().optional(),
  state: z.string().optional(),
  scheduledAt: z.string().optional(),
  notes: z.string().optional(),
  totalAmount: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const data = parsed.data;

  const job = await prisma.job.create({
    data: {
      userId: user.id,
      title: data.title,
      description: data.description,
      customerId: data.customerId || null,
      jobType: data.jobType,
      status: data.status ?? "ENQUIRY",
      address: data.address,
      suburb: data.suburb,
      state: data.state as any,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      notes: data.notes,
      totalAmount: data.totalAmount,
    },
  });

  await prisma.jobTimeline.create({
    data: {
      jobId: job.id,
      event: `Job created with status: ${job.status}`,
    },
  });

  return NextResponse.json(job);
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const jobs = await prisma.job.findMany({
    where: { userId: user.id },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(jobs);
}
