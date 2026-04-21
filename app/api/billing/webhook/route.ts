import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;

      const userId = session.subscription_data?.metadata?.userId as string;
      const plan = session.subscription_data?.metadata?.plan as string;
      if (!userId || !plan) break;

      const stripeSubscriptionId = session.subscription as string;
      const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          plan: plan as any,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId,
          status: "ACTIVE",
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        },
        update: {
          plan: plan as any,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId,
          status: "ACTIVE",
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          cancelAtPeriodEnd: false,
        },
      });
      break;
    }

    case "customer.subscription.updated": {
      const stripeSub = event.data.object as Stripe.Subscription;
      const sub = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: stripeSub.id },
      });
      if (!sub) break;

      const status = stripeSub.status === "active"
        ? "ACTIVE"
        : stripeSub.status === "trialing"
        ? "TRIALING"
        : stripeSub.status === "past_due"
        ? "PAST_DUE"
        : "CANCELED";

      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: status as any,
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const stripeSub = event.data.object as Stripe.Subscription;
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: stripeSub.id },
        data: { status: "CANCELED", cancelAtPeriodEnd: false },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSub = await stripe.subscriptions.retrieve(invoice.subscription as string);
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: stripeSub.id },
        data: { status: "PAST_DUE" },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
