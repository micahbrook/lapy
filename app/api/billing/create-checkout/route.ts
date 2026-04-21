import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { stripe, STRIPE_PLANS } from "@/lib/stripe";

const schema = z.object({
  plan: z.enum(["SOLO", "CREW", "BUSINESS"]),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { plan } = parsed.data;
  const planConfig = STRIPE_PLANS[plan];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });

  // Reuse or create Stripe customer
  let customerId = sub?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.businessName ?? user.name,
      metadata: { userId: user.id, clerkId: userId },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    success_url: `${appUrl}/settings/billing?success=1`,
    cancel_url: `${appUrl}/settings/billing?canceled=1`,
    subscription_data: {
      metadata: { userId: user.id, plan },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
