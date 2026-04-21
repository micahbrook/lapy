import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anthropic, AI_MODEL } from "@/lib/anthropic";
import { resend, RESEND_FROM } from "@/lib/resend";
import { buildReminderEmail } from "@/lib/email/ReminderEmail";
import { daysOverdue, formatAUD } from "@/lib/utils";

// Vercel cron hits this at 23:00 UTC daily (9am AEST)
export async function GET(req: NextRequest) {
  // Vercel passes Authorization: Bearer <CRON_SECRET> for cron routes
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const now = new Date();

  // Find all SENT invoices that are past due with customer emails
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: { in: ["SENT", "OVERDUE"] },
      dueDate: { lt: now },
    },
    include: {
      user: true,
      job: { include: { customer: true } },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const invoice of overdueInvoices) {
    const customer = invoice.job?.customer ?? null;
    if (!customer?.email) continue;

    const user = invoice.user;
    const overdueDays = daysOverdue(invoice.dueDate!);
    const reminders = (invoice.remindersSent as any[]) ?? [];

    // Determine tone based on days overdue
    let tone: "friendly" | "firm" | "final";
    if (overdueDays <= 7) tone = "friendly";
    else if (overdueDays <= 21) tone = "firm";
    else tone = "final";

    // Skip if we already sent this tone
    if (reminders.some((r: any) => r.tone === tone && r.auto)) continue;

    // Also skip if a manual reminder was sent in the last 3 days
    const recentManual = reminders.some((r: any) => {
      const sent = new Date(r.sentAt);
      const diffDays = (now.getTime() - sent.getTime()) / 86400000;
      return !r.auto && diffDays < 3;
    });
    if (recentManual) continue;

    try {
      const businessName = user.businessName ?? user.name;
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
Days overdue: ${overdueDays}

Write 2-3 short paragraphs. Sign off with ${businessName}. Use Australian English. Return ONLY the message body.`,
          },
        ],
      });

      const message = aiRes.content[0].type === "text" ? aiRes.content[0].text : "";

      const { subject, html } = buildReminderEmail({
        invoice,
        user,
        customer,
        message,
        tone,
        appUrl: process.env.NEXT_PUBLIC_APP_URL!,
      });

      const { data, error } = await resend.emails.send({
        from: RESEND_FROM,
        to: customer.email,
        subject,
        html,
      });

      if (error) {
        failed++;
        continue;
      }

      await Promise.all([
        prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            remindersSent: [
              ...reminders,
              { tone, sentAt: now.toISOString(), messageId: data?.id, auto: true },
            ],
            status: "OVERDUE",
          },
        }),
        prisma.notification.create({
          data: {
            userId: user.id,
            type: "INVOICE_OVERDUE",
            message: `Auto-reminder sent: ${invoice.invoiceNumber} — ${tone} auto-reminder sent to ${customer.email} (${overdueDays} days overdue)`,
          },
        }),
      ]);

      sent++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ success: true, sent, failed, total: overdueInvoices.length });
}
