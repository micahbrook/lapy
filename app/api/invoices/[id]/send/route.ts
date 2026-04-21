import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { prisma } from "@/lib/prisma";
import { resend, RESEND_FROM } from "@/lib/resend";
import { uploadFile } from "@/lib/supabase";
import { InvoicePDF } from "@/lib/pdf/InvoicePDF";
import { buildInvoiceEmail } from "@/lib/email/InvoiceEmail";

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  let buffer: Buffer | undefined;
  let pdfUrl = invoice.pdfUrl;

  if (!pdfUrl) {
    buffer = await renderToBuffer(
      createElement(InvoicePDF, { invoice, user, customer })
    );
    try {
      pdfUrl = await uploadFile("pdfs", `invoices/${id}.pdf`, buffer, "application/pdf");
      await prisma.invoice.update({ where: { id }, data: { pdfUrl } });
    } catch {
      // non-fatal
    }
  }

  const { subject, html } = buildInvoiceEmail({ invoice, user, customer, appUrl });

  const attachments = buffer
    ? [{ filename: `${invoice.invoiceNumber}.pdf`, content: buffer }]
    : [];

  const { data, error } = await resend.emails.send({
    from: RESEND_FROM,
    to: customer.email,
    subject,
    html,
    attachments,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await prisma.invoice.update({
    where: { id },
    data: { status: invoice.status === "DRAFT" ? "SENT" : invoice.status },
  });

  return NextResponse.json({ success: true, messageId: data?.id });
}
