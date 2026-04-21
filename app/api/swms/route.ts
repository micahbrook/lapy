import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  swmsNumber: z.string(),
  jobId: z.string().optional(),
  jobDescription: z.string().optional(),
  siteAddress: z.string().optional(),
  principalContractor: z.string().optional(),
  scopeOfWork: z.string().optional(),
  highRiskWork: z.boolean().optional(),
  highRiskCategories: z.array(z.string()).optional(),
  hazards: z.array(z.any()).optional(),
  ppe: z.array(z.any()).optional(),
  emergencyProcedures: z.string().optional(),
  nearestHospital: z.string().optional(),
  isTemplate: z.boolean().optional(),
  templateName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const data = parsed.data;

  const swms = await prisma.swms.create({
    data: {
      userId: user.id,
      jobId: data.jobId || null,
      swmsNumber: data.swmsNumber,
      jobDescription: data.jobDescription,
      siteAddress: data.siteAddress,
      principalContractor: data.principalContractor,
      scopeOfWork: data.scopeOfWork,
      highRiskWork: data.highRiskWork ?? false,
      highRiskCategories: data.highRiskCategories ?? [],
      hazards: data.hazards ?? [],
      ppe: data.ppe ?? [],
      emergencyProcedures: data.emergencyProcedures,
      nearestHospital: data.nearestHospital,
      isTemplate: data.isTemplate ?? false,
      templateName: data.templateName,
      status: "DRAFT",
    },
  });

  return NextResponse.json(swms);
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const swmsList = await prisma.swms.findMany({
    where: { userId: user.id },
    include: { job: { include: { customer: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(swmsList);
}
