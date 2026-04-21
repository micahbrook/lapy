import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  businessName: z.string().optional(),
  abn: z.string().optional(),
  tradeType: z.string().optional(),
  state: z.string().optional(),
  licenceNumber: z.string().optional(),
  phone: z.string().optional(),
  brandColour: z.string().optional(),
  bankBsb: z.string().optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
  defaultPaymentTerms: z.number().optional(),
  defaultQuoteValidity: z.number().optional(),
  defaultNotes: z.string().optional(),
  invoiceFooter: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const user = await prisma.user.update({
    where: { clerkId: userId },
    data: {
      ...parsed.data,
      tradeType: parsed.data.tradeType as any,
      state: parsed.data.state as any,
    },
  });

  return NextResponse.json(user);
}
