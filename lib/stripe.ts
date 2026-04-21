import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const STRIPE_PLANS = {
  SOLO: {
    name: "Solo",
    price: 79,
    priceId: process.env.STRIPE_SOLO_PRICE_ID!,
    description: "Perfect for sole traders",
    features: [
      "1 user",
      "Unlimited quotes & invoices",
      "SWMS generator",
      "AI-powered features",
      "PDF export",
      "Email notifications",
    ],
    limits: { users: 1 },
  },
  CREW: {
    name: "Crew",
    price: 149,
    priceId: process.env.STRIPE_CREW_PRICE_ID!,
    description: "For small teams",
    features: [
      "Up to 5 users",
      "Everything in Solo",
      "Job scheduling & calendar",
      "SMS notifications",
      "Team management",
    ],
    limits: { users: 5 },
  },
  BUSINESS: {
    name: "Business",
    price: 299,
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID!,
    description: "For growing businesses",
    features: [
      "Unlimited users",
      "Everything in Crew",
      "Xero accounting sync",
      "Parts inventory",
      "Advanced analytics",
      "Priority support",
    ],
    limits: { users: Infinity },
  },
} as const;
