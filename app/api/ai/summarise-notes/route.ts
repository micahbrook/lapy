import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { z } from "zod";
import { anthropic, AI_MODEL, logAiUsage } from "@/lib/anthropic";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  notes: z.string().min(5),
  jobTitle: z.string().optional(),
  customerName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorised", { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return new Response("User not found", { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });

  const { notes, jobTitle, customerName } = parsed.data;

  const prompt = `Summarise these job notes from an Australian tradie:

Job: ${jobTitle ?? "Unknown job"}
Customer: ${customerName ?? "Unknown customer"}

Raw Notes:
${notes}

Return JSON:
{
  "summary": "Clean 2-3 sentence job summary",
  "followUpActions": ["action 1", "action 2"],
  "partsToOrder": ["part 1", "part 2"],
  "customerCommunication": "Draft message to send to customer about job progress/completion",
  "billingNotes": "Any items to add to invoice or quote"
}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let totalInput = 0, totalOutput = 0;
      try {
        const response = await anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
          system: "You are an assistant for Australian tradies. Extract structured information from job notes. Respond with valid JSON only.",
          stream: true,
        });
        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
          if (event.type === "message_delta" && event.usage) totalOutput = event.usage.output_tokens;
          if (event.type === "message_start" && event.message.usage) totalInput = event.message.usage.input_tokens;
        }
        await logAiUsage(user.id, "summarise-notes", { input_tokens: totalInput, output_tokens: totalOutput });
      } catch {
        controller.enqueue(encoder.encode(JSON.stringify({ error: "Summarisation failed", summary: notes })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
