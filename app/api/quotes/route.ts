import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generatePublicToken } from "@/lib/utils";

const schema = z.object({
  quoteNumber: z.string(),
  customerId: z.string().optional(),
  jobId: z.string().optional(),
  lineItems: z.array(z.any()),
  subtotal: z.number(),
  gst: z.number(),
  total: z.number(),
  notes: z.string().optional(),
  validUntil: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "DECLINED"]).optional(),
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

  const quote = await prisma.quote.create({
    data: {
      userId: user.id,
      quoteNumber: data.quoteNumber,
      customerId: data.customerId || null,
      jobId: data.jobId || null,
      lineItems: data.lineItems,
      subtotal: data.subtotal,
      gst: data.gst,
      total: data.total,
      notes: data.notes,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      status: data.status ?? "DRAFT",
      publicToken: generatePublicToken(),
      sentAt: data.status === "SENT" ? new Date() : null,
    },
  });

  return NextResponse.json(quote);
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const quotes = await prisma.quote.findMany({
    where: { userId: user.id },
    include: { customer: true, job: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(quotes);
}
