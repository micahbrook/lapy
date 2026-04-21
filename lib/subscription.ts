import { prisma } from "./prisma";

export async function getSubscription(userId: string) {
  return prisma.subscription.findUnique({ where: { userId } });
}

export async function isSubscriptionActive(userId: string): Promise<boolean> {
  const sub = await getSubscription(userId);
  if (!sub) return false;
  return sub.status === "ACTIVE" || sub.status === "TRIALING";
}

export async function requireActiveSubscription(userId: string): Promise<boolean> {
  const sub = await getSubscription(userId);
  if (!sub) return false;

  if (sub.status === "ACTIVE") return true;

  if (sub.status === "TRIALING") {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.trialEndsAt) return true;
    return new Date(user.trialEndsAt) > new Date();
  }

  return false;
}

export async function getOrCreateSubscription(userId: string) {
  const existing = await getSubscription(userId);
  if (existing) return existing;

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const [sub] = await Promise.all([
    prisma.subscription.create({
      data: { userId, plan: "SOLO", status: "TRIALING" },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { trialEndsAt },
    }),
  ]);

  return sub;
}
