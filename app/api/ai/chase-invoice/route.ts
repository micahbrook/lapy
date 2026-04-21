import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { z } from "zod";
import { anthropic, AI_MODEL, logAiUsage } from "@/lib/anthropic";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  invoiceNumber: z.string(),
  amount: z.number(),
  daysOverdue: z.number(),
  customerName: z.string(),
  paymentHistory: z.string().optional(),
  paymentLink: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorised", { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return new Response("User not found", { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });

  const { invoiceNumber, amount, daysOverdue, customerName, paymentHistory, paymentLink } = parsed.data;
  const formattedAmount = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
  const businessName = user.businessName ?? user.name;

  const prompt = `Generate 3 invoice payment reminder messages for an Australian trade business.

Invoice Details:
- Invoice Number: ${invoiceNumber}
- Amount: ${formattedAmount}
- Days Overdue: ${daysOverdue}
- Customer Name: ${customerName}
- Business Name: ${businessName}
- Payment Link: ${paymentLink ?? "[PAYMENT_LINK]"}
- Payment History: ${paymentHistory ?? "First invoice with this customer"}

Generate 3 messages with different tones. Use Australian English (e.g., "cheers", "mate" sparingly, professional but warm). Return JSON:
{
  "messages": [
    {
      "tone": "Friendly Reminder",
      "subject": "email subject line",
      "sms": "SMS message under 160 chars",
      "email": "Full email body (2-3 paragraphs)"
    },
    {
      "tone": "Firm Follow-up",
      "subject": "email subject line",
      "sms": "SMS message under 160 chars",
      "email": "Full email body (2-3 paragraphs)"
    },
    {
      "tone": "Final Notice",
      "subject": "email subject line",
      "sms": "SMS message under 160 chars",
      "email": "Full email body mentioning potential debt recovery action)"
    }
  ]
}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let totalInput = 0;
      let totalOutput = 0;
      try {
        const response = await anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
          system: "You are a professional business communication assistant for Australian trade businesses. Respond with valid JSON only.",
          stream: true,
        });
        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
          if (event.type === "message_delta" && event.usage) totalOutput = event.usage.output_tokens;
          if (event.type === "message_start" && event.message.usage) totalInput = event.message.usage.input_tokens;
        }
        await logAiUsage(user.id, "chase-invoice", { input_tokens: totalInput, output_tokens: totalOutput });
      } catch {
        controller.enqueue(encoder.encode(JSON.stringify({ error: "Generation failed", messages: [] })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
