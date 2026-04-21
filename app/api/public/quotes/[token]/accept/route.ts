import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/twilio";

const schema = z.object({
  action: z.enum(["accept", "decline"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const quote = await prisma.quote.findUnique({
    where: { publicToken: token },
    include: { customer: true, user: true },
  });

  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (quote.status === "ACCEPTED" || quote.status === "DECLINED") {
    return NextResponse.json({ error: "Quote already actioned" }, { status: 409 });
  }

  const isExpired = quote.validUntil && new Date(quote.validUntil) < new Date();
  if (isExpired) {
    return NextResponse.json({ error: "Quote has expired" }, { status: 410 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { action } = parsed.data;
  const newStatus = action === "accept" ? "ACCEPTED" : "DECLINED";

  const [updatedQuote] = await Promise.all([
    prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: newStatus,
        ...(action === "accept" ? { acceptedAt: new Date() } : {}),
      },
    }),
    // Create notification for the tradie
    prisma.notification.create({
      data: {
        userId: quote.userId,
        type: action === "accept" ? "QUOTE_ACCEPTED" : "QUOTE_DECLINED",
        message: action === "accept"
          ? `Quote accepted: ${quote.quoteNumber} — ${quote.customer?.name ?? "Customer"} has accepted.`
          : `Quote declined: ${quote.quoteNumber} — ${quote.customer?.name ?? "Customer"} has declined.`,
      },
    }),
  ]);

  // Auto-create a job when quote is accepted
  if (action === "accept" && quote.customerId) {
    try {
      const job = await prisma.job.create({
        data: {
          userId: quote.userId,
          customerId: quote.customerId,
          title: `Job from ${quote.quoteNumber}`,
          notes: quote.notes,
          status: "QUOTED",
        },
      });
      // Link quote to the new job
      await prisma.quote.update({
        where: { id: quote.id },
        data: { jobId: job.id },
      });
    } catch {
      // non-fatal
    }
  }

  // SMS the tradie when a quote is accepted
  if (action === "accept" && quote.user.phone) {
    try {
      const customerName = quote.customer?.name ?? "A customer";
      await sendSms(
        quote.user.phone,
        `TradieMate: ${customerName} has accepted ${quote.quoteNumber}. Log in to view details.`
      );
    } catch {
      // non-fatal — don't fail the acceptance if SMS fails
    }
  }

  return NextResponse.json({ success: true, status: updatedQuote.status });
}
