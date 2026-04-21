import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const AI_MODEL = "claude-sonnet-4-20250514";

export async function logAiUsage(
  userId: string,
  feature: string,
  usage: { input_tokens: number; output_tokens: number }
) {
  const { prisma } = await import("./prisma");
  await prisma.aiUsageLog.create({
    data: {
      userId,
      feature,
      tokensIn: usage.input_tokens,
      tokensOut: usage.output_tokens,
      model: AI_MODEL,
    },
  });
}
