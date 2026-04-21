import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { prisma } from "@/lib/prisma";
import { resend, RESEND_FROM } from "@/lib/resend";
import { uploadFile } from "@/lib/supabase";
import { QuotePDF } from "@/lib/pdf/QuotePDF";
import { buildQuoteEmail } from "@/lib/email/QuoteEmail";

export async function POST(
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
    include: { customer: true },
  });

  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!quote.customer?.email) {
    return NextResponse.json({ error: "Customer has no email address" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  let buffer: Buffer | undefined;
  let pdfUrl = quote.pdfUrl;

  if (!pdfUrl) {
    buffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(QuotePDF, { quote, user, customer: quote.customer }) as any
    );
    try {
      pdfUrl = await uploadFile("pdfs", `quotes/${id}.pdf`, buffer, "application/pdf");
      await prisma.quote.update({ where: { id }, data: { pdfUrl } });
    } catch {
      // non-fatal
    }
  }

  const { subject, html } = buildQuoteEmail({
    quote,
    user,
    customer: quote.customer,
    appUrl,
  });

  const attachments = buffer
    ? [{ filename: `${quote.quoteNumber}.pdf`, content: buffer }]
    : [];

  const { data, error } = await resend.emails.send({
    from: RESEND_FROM,
    to: quote.customer.email,
    subject,
    html,
    attachments,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await prisma.quote.update({
    where: { id },
    data: {
      status: quote.status === "DRAFT" ? "SENT" : quote.status,
      sentAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, messageId: data?.id });
}
