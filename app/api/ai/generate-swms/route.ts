import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { z } from "zod";
import { anthropic, AI_MODEL, logAiUsage } from "@/lib/anthropic";
import { prisma } from "@/lib/prisma";
import { STATE_REGULATORS } from "@/lib/utils";

const schema = z.object({
  jobDescription: z.string().min(10),
  siteAddress: z.string().optional(),
  tradeType: z.string(),
  state: z.string(),
  principalContractor: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorised", { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return new Response("User not found", { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });

  const { jobDescription, siteAddress, tradeType, state, principalContractor } = parsed.data;
  const regulator = STATE_REGULATORS[state] ?? "SafeWork Australia";

  const systemPrompt = `You are an expert Australian WHS (Work Health and Safety) consultant specialising in Safe Work Method Statements (SWMS) for trade businesses. You have deep knowledge of:
- Work Health and Safety Act 2011 (Commonwealth) and state equivalents
- Work Health and Safety Regulation 2011 Schedule 3 (High Risk Construction Work)
- Safe Work Australia codes of practice
- ${regulator} specific requirements
- Australian trade industry standards and practices

Always respond with valid JSON only. No markdown, no explanation outside the JSON structure.`;

  const userPrompt = `Generate a comprehensive SWMS for the following job:

Trade Type: ${tradeType}
State/Territory: ${state}
Job Description: ${jobDescription}
Site Address: ${siteAddress ?? "To be confirmed"}
Principal Contractor: ${principalContractor ?? "N/A"}

Return a JSON object with this exact structure:
{
  "scopeOfWork": "detailed description of work to be performed",
  "highRiskWork": boolean,
  "highRiskCategories": ["array of applicable HRCW categories from WHS Reg 2011 Schedule 3"],
  "hazards": [
    {
      "id": "unique id",
      "hazard": "hazard description",
      "likelihood": "High|Medium|Low",
      "consequence": "High|Medium|Low",
      "initialRisk": "High|Medium|Low",
      "controls": ["control measure 1", "control measure 2"],
      "residualRisk": "High|Medium|Low",
      "responsiblePerson": "role responsible"
    }
  ],
  "ppe": [
    { "item": "PPE item name", "required": boolean, "specification": "standard/spec if applicable" }
  ],
  "emergencyProcedures": "detailed emergency procedures including evacuation, first aid, and incident reporting",
  "nearestHospital": "nearest hospital to ${siteAddress ?? "the site"}",
  "regulatoryReferences": ["list of specific WHS regulations, codes of practice, and standards that apply"],
  "tradeSpecificRequirements": ["list of trade-specific licensing, certification, or compliance requirements for ${tradeType} in ${state}"]
}

Include at minimum:
- 5-8 relevant hazards specific to ${tradeType} work
- All applicable PPE for ${tradeType}
- HRCW categories if this work qualifies (electrical work >50V, work at heights >2m, excavation >1.5m, etc.)
- State-specific regulatory references for ${regulator}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let totalInput = 0;
      let totalOutput = 0;
      let fullContent = "";

      try {
        const response = await anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 4096,
          messages: [{ role: "user", content: userPrompt }],
          system: systemPrompt,
          stream: true,
        });

        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            fullContent += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
          if (event.type === "message_delta" && event.usage) {
            totalOutput = event.usage.output_tokens;
          }
          if (event.type === "message_start" && event.message.usage) {
            totalInput = event.message.usage.input_tokens;
          }
        }

        // Log usage
        await logAiUsage(user.id, "generate-swms", {
          input_tokens: totalInput,
          output_tokens: totalOutput,
        });
      } catch (err) {
        const fallback = JSON.stringify({
          error: "AI generation failed. Please try again.",
          scopeOfWork: jobDescription,
          highRiskWork: false,
          highRiskCategories: [],
          hazards: [],
          ppe: [],
          emergencyProcedures: "Call 000 in case of emergency.",
          nearestHospital: "Locate nearest hospital",
          regulatoryReferences: [],
          tradeSpecificRequirements: [],
        });
        controller.enqueue(encoder.encode(fallback));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
