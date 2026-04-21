import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateInvoiceNumber, generatePublicToken } from "@/lib/utils";

const schema = z.object({
  jobId: z.string().optional(),
  quoteId: z.string().optional(),
  lineItems: z.array(z.any()),
  subtotal: z.number(),
  gst: z.number(),
  total: z.number(),
  depositAmount: z.number().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE"]).optional(),
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

  const count = await prisma.invoice.count({ where: { userId: user.id } });
  const invoiceNumber = generateInvoiceNumber(count + 1);

  const invoice = await prisma.invoice.create({
    data: {
      userId: user.id,
      invoiceNumber,
      jobId: data.jobId ?? null,
      quoteId: data.quoteId ?? null,
      lineItems: data.lineItems,
      subtotal: data.subtotal,
      gst: data.gst,
      total: data.total,
      depositAmount: data.depositAmount ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes ?? null,
      status: data.status ?? "DRAFT",
      publicToken: generatePublicToken(),
    },
  });

  return NextResponse.json(invoice);
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as any;

  const invoices = await prisma.invoice.findMany({
    where: {
      userId: user.id,
      ...(status ? { status } : {}),
    },
    include: { job: { include: { customer: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invoices);
}
