import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { z } from "zod";
import { anthropic, AI_MODEL, logAiUsage } from "@/lib/anthropic";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  jobType: z.string(),
  estimatedHours: z.number(),
  materialsCost: z.number().optional(),
  suburb: z.string().optional(),
  state: z.string().optional(),
  tradeType: z.string(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorised", { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return new Response("User not found", { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });

  const { jobType, estimatedHours, materialsCost, suburb, state, tradeType } = parsed.data;

  const prompt = `Provide pricing advice for an Australian ${tradeType} job:

Job Type: ${jobType}
Estimated Hours: ${estimatedHours}
Materials Cost: $${materialsCost ?? 0} AUD
Location: ${suburb ?? ""} ${state ?? "Australia"}

Return JSON:
{
  "suggestedPrice": number,
  "priceRange": { "min": number, "max": number },
  "breakdown": {
    "labour": number,
    "materials": number,
    "markup": number,
    "callOut": number,
    "subtotal": number,
    "gst": number,
    "total": number
  },
  "reasoning": "2-3 sentences explaining the pricing",
  "marketComparison": "How this compares to typical rates in ${state ?? "Australia"}",
  "awardRateReference": "Relevant Modern Award or EBA reference if applicable",
  "tips": ["pricing tip 1", "pricing tip 2"]
}

Base on current Australian market rates for ${tradeType} in ${state ?? "Australia"}.`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let totalInput = 0, totalOutput = 0;
      try {
        const response = await anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
          system: "You are a pricing expert for Australian trade businesses. Provide accurate, market-rate pricing advice. Respond with valid JSON only.",
          stream: true,
        });
        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
          if (event.type === "message_delta" && event.usage) totalOutput = event.usage.output_tokens;
          if (event.type === "message_start" && event.message.usage) totalInput = event.message.usage.input_tokens;
        }
        await logAiUsage(user.id, "pricing-advice", { input_tokens: totalInput, output_tokens: totalOutput });
      } catch {
        controller.enqueue(encoder.encode(JSON.stringify({ error: "Pricing advice failed" })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
