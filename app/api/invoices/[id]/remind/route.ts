import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { anthropic, AI_MODEL } from "@/lib/anthropic";
import { resend, RESEND_FROM } from "@/lib/resend";
import { buildReminderEmail } from "@/lib/email/ReminderEmail";
import { daysOverdue, formatAUD } from "@/lib/utils";

const schema = z.object({
  tone: z.enum(["friendly", "firm", "final"]),
  message: z.string().optional(),
});

export async function POST(
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
    include: { job: { include: { customer: true } } },
  });

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const customer = invoice.job?.customer ?? null;
  if (!customer?.email) {
    return NextResponse.json({ error: "Customer has no email address" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { tone } = parsed.data;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const businessName = user.businessName ?? user.name;
  const overdueDays = invoice.dueDate ? daysOverdue(invoice.dueDate) : 0;

  // Generate message with Claude if not provided
  let message = parsed.data.message;
  if (!message) {
    const aiRes = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Write a ${tone} payment reminder email body for an Australian tradie.
Business: ${businessName}
Customer: ${customer.name}
Invoice: ${invoice.invoiceNumber}
Amount: ${formatAUD(Number(invoice.total))} AUD
Due date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-AU") : "past due"}
Days overdue: ${overdueDays}

Write 2-3 short paragraphs. Sign off with ${businessName}. Use Australian English. Return ONLY the message body, no subject line.`,
        },
      ],
    });

    message = aiRes.content[0].type === "text" ? aiRes.content[0].text : "";
  }

  const { subject, html } = buildReminderEmail({
    invoice,
    user,
    customer,
    message,
    tone,
    appUrl,
  });

  const { data, error } = await resend.emails.send({
    from: RESEND_FROM,
    to: customer.email,
    subject,
    html,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const reminders = (invoice.remindersSent as any[]) ?? [];
  await Promise.all([
    prisma.invoice.update({
      where: { id },
      data: {
        remindersSent: [...reminders, { tone, sentAt: new Date().toISOString(), messageId: data?.id }],
        status: "OVERDUE",
      },
    }),
    prisma.notification.create({
      data: {
        userId: user.id,
        type: "INVOICE_OVERDUE",
        title: `Reminder sent: ${invoice.invoiceNumber}`,
        message: `${tone} reminder sent to ${customer.email}`,
      },
    }),
  ]);

  return NextResponse.json({ success: true, messageId: data?.id });
}
