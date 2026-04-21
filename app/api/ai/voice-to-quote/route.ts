import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { z } from "zod";
import { anthropic, AI_MODEL, logAiUsage } from "@/lib/anthropic";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  transcript: z.string().min(5),
  tradeType: z.string().optional(),
  state: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorised", { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return new Response("User not found", { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });

  const { transcript, tradeType, state } = parsed.data;

  const systemPrompt = `You are an expert quoting assistant for Australian trade businesses. You extract structured job information from voice transcripts or descriptions to create professional quotes. You understand Australian trade pricing, award rates, and GST.

Always respond with valid JSON only.`;

  const userPrompt = `Extract quote line items from this job description/transcript:

"${transcript}"

Trade Type: ${tradeType ?? "Not specified"}
State: ${state ?? "Australia"}

Return a JSON object:
{
  "jobType": "brief job type",
  "summary": "one sentence job summary",
  "estimatedHours": number,
  "lineItems": [
    {
      "description": "item description",
      "quantity": number,
      "unit": "hr|ea|m|m2|m3|day|lump",
      "unitPrice": number,
      "includeGst": true,
      "total": number
    }
  ],
  "subtotal": number,
  "gst": number,
  "total": number,
  "notes": "any special conditions or assumptions",
  "pricingRationale": "brief explanation of pricing assumptions"
}

Pricing guidelines for Australian ${tradeType ?? "trade"} in ${state ?? "Australia"}:
- Labour: $85-$150/hr depending on trade and complexity
- Call-out fee: $80-$150 for first hour
- Materials: mark up supplier cost by 15-30%
- Travel: $1.50-$2.50/km or flat fee
- Include 10% GST on all items
- Reference Fair Work Australia Modern Awards where applicable`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let totalInput = 0;
      let totalOutput = 0;

      try {
        const response = await anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 2048,
          messages: [{ role: "user", content: userPrompt }],
          system: systemPrompt,
          stream: true,
        });

        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
          if (event.type === "message_delta" && event.usage) {
            totalOutput = event.usage.output_tokens;
          }
          if (event.type === "message_start" && event.message.usage) {
            totalInput = event.message.usage.input_tokens;
          }
        }

        await logAiUsage(user.id, "voice-to-quote", {
          input_tokens: totalInput,
          output_tokens: totalOutput,
        });
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              error: "Could not parse job description. Please try again.",
              lineItems: [],
              subtotal: 0,
              gst: 0,
              total: 0,
            })
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Transfer-Encoding": "chunked" },
  });
}
