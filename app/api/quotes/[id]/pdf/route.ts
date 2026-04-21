import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/supabase";
import { QuotePDF } from "@/lib/pdf/QuotePDF";

export async function GET(
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

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(QuotePDF, { quote, user, customer: quote.customer }) as any
  );

  // Upload to Supabase and cache pdfUrl
  try {
    const pdfUrl = await uploadFile(
      "pdfs",
      `quotes/${id}.pdf`,
      buffer,
      "application/pdf"
    );
    await prisma.quote.update({ where: { id }, data: { pdfUrl } });
  } catch {
    // Upload failure is non-fatal — still return PDF
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quote.quoteNumber}.pdf"`,
    },
  });
}
