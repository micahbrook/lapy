import { PrismaClient } from "@prisma/client";
import { addDays, subDays, subHours } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding demo data...");

  // Create demo user (electrician, NSW)
  const user = await prisma.user.upsert({
    where: { email: "demo@tradiemate.com.au" },
    update: {},
    create: {
      clerkId: "demo_clerk_id_change_me",
      email: "demo@tradiemate.com.au",
      name: "Jake Smith",
      phone: "0412 345 678",
      businessName: "Smith Electrical Services",
      abn: "12 345 678 901",
      tradeType: "ELECTRICIAN",
      licenceNumber: "EC123456",
      state: "NSW",
      brandColour: "#f97316",
      bankName: "Commonwealth Bank",
      bankBsb: "062-000",
      bankAccount: "12345678",
      defaultPaymentTerms: 14,
      defaultQuoteValidity: 30,
      defaultNotes: "Payment due within 14 days of invoice date. Thank you for your business.",
      invoiceFooter: "Smith Electrical Services · ABN 12 345 678 901 · Lic EC123456\nBank: Commonwealth Bank · BSB: 062-000 · Acc: 12345678",
      onboardingComplete: true,
    },
  });

  console.log("✅ Demo user created:", user.businessName);

  // Create subscription
  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      plan: "CREW",
      status: "ACTIVE",
      currentPeriodEnd: addDays(new Date(), 30),
    },
  });

  // Create 5 customers
  const customerData = [
    { name: "David & Lisa Johnson", email: "david.johnson@gmail.com", phone: "0423 456 789", address: "42 Harbour View Drive", suburb: "Manly", state: "NSW" as const, postcode: "2095" },
    { name: "Sarah Chen", email: "s.chen@hotmail.com", phone: "0434 567 890", address: "15 Pacific Highway", suburb: "Chatswood", state: "NSW" as const, postcode: "2067" },
    { name: "Roberts Construction Pty Ltd", email: "accounts@robertsconstruction.com.au", phone: "02 9123 4567", address: "88 Industrial Avenue", suburb: "Rydalmere", state: "NSW" as const, postcode: "2116" },
    { name: "Tony Nguyen", email: "tony.nguyen@outlook.com", phone: "0445 678 901", address: "3/22 Parramatta Road", suburb: "Homebush", state: "NSW" as const, postcode: "2140" },
    { name: "Beachside Cafe", email: "manager@beachsidecafe.com.au", phone: "02 9876 5432", address: "1 Ocean Street", suburb: "Bondi Beach", state: "NSW" as const, postcode: "2026" },
  ];

  const customers = [];
  for (const c of customerData) {
    const customer = await prisma.customer.upsert({
      where: { id: `seed_customer_${c.name.replace(/\s/g, "_")}` },
      update: {},
      create: { id: `seed_customer_${c.name.replace(/\s/g, "_")}`, userId: user.id, ...c },
    });
    customers.push(customer);
    console.log("✅ Customer:", customer.name);
  }

  // Create 3 jobs in different statuses
  const job1 = await prisma.job.upsert({
    where: { id: "seed_job_1" },
    update: {},
    create: {
      id: "seed_job_1",
      userId: user.id,
      customerId: customers[0].id,
      title: "Switchboard Upgrade — 3-phase",
      description: "Upgrade existing single-phase 60A switchboard to 3-phase 200A. Install new MSB with RCDs and circuit breakers to AS/NZS 3000.",
      status: "IN_PROGRESS",
      jobType: "Residential",
      address: "42 Harbour View Drive",
      suburb: "Manly",
      state: "NSW",
      scheduledAt: subHours(new Date(), 2),
      totalAmount: 4850,
      notes: "Customer wants LED lighting upgrade quoted separately.",
    },
  });

  const job2 = await prisma.job.upsert({
    where: { id: "seed_job_2" },
    update: {},
    create: {
      id: "seed_job_2",
      userId: user.id,
      customerId: customers[2].id,
      title: "Commercial Office Fitout — Level 3",
      description: "New electrical fitout for 450sqm office space. 48 power points, data cabling, LED lighting, exit signs, emergency lighting.",
      status: "QUOTED",
      jobType: "Commercial",
      address: "88 Industrial Avenue",
      suburb: "Rydalmere",
      state: "NSW",
      scheduledAt: addDays(new Date(), 7),
      totalAmount: 28500,
    },
  });

  const job3 = await prisma.job.upsert({
    where: { id: "seed_job_3" },
    update: {},
    create: {
      id: "seed_job_3",
      userId: user.id,
      customerId: customers[4].id,
      title: "Commercial Kitchen Power Install",
      description: "Install 3-phase power for new commercial kitchen equipment: 2x commercial ovens, 1x industrial dishwasher, exhaust fan motor.",
      status: "COMPLETED",
      jobType: "Commercial",
      address: "1 Ocean Street",
      suburb: "Bondi Beach",
      state: "NSW",
      scheduledAt: subDays(new Date(), 5),
      completedAt: subDays(new Date(), 4),
      totalAmount: 6200,
    },
  });

  console.log("✅ Jobs created");

  // Add timeline entries
  await prisma.jobTimeline.createMany({
    data: [
      { jobId: job1.id, event: "Job created with status: IN_PROGRESS", createdAt: subDays(new Date(), 3) },
      { jobId: job1.id, event: "SWMS generated and signed", createdAt: subDays(new Date(), 2) },
      { jobId: job1.id, event: "Work commenced on site", detail: "Switchboard isolation completed", createdAt: subHours(new Date(), 3) },
      { jobId: job2.id, event: "Job created from customer enquiry", createdAt: subDays(new Date(), 7) },
      { jobId: job2.id, event: "Quote QT-2026-0001 sent to customer", createdAt: subDays(new Date(), 5) },
      { jobId: job3.id, event: "Job created", createdAt: subDays(new Date(), 10) },
      { jobId: job3.id, event: "Job completed", createdAt: subDays(new Date(), 4) },
      { jobId: job3.id, event: "Invoice INV-2026-0001 sent", createdAt: subDays(new Date(), 3) },
    ],
    skipDuplicates: true,
  });

  // Create 2 quotes
  const quote1 = await prisma.quote.upsert({
    where: { quoteNumber: "QT-2026-0001" },
    update: {},
    create: {
      userId: user.id,
      jobId: job2.id,
      customerId: customers[2].id,
      quoteNumber: "QT-2026-0001",
      lineItems: [
        { description: "Labour — Electrical fitout (2 electricians × 3 days)", quantity: 48, unit: "hr", unitPrice: 120, includeGst: true, total: 5760 },
        { description: "LED Panel Lights (600×600) supply & install", quantity: 24, unit: "ea", unitPrice: 285, includeGst: true, total: 6840 },
        { description: "GPO Double Power Points supply & install", quantity: 48, unit: "ea", unitPrice: 145, includeGst: true, total: 6960 },
        { description: "Exit & Emergency Lighting supply & install", quantity: 8, unit: "ea", unitPrice: 380, includeGst: true, total: 3040 },
        { description: "Data cabling — Cat6 per run", quantity: 24, unit: "ea", unitPrice: 95, includeGst: true, total: 2280 },
        { description: "Switchboard modifications & circuit breakers", quantity: 1, unit: "lump", unitPrice: 2200, includeGst: true, total: 2200 },
        { description: "Materials allowance (conduit, cable, connectors)", quantity: 1, unit: "lump", unitPrice: 1200, includeGst: true, total: 1200 },
      ],
      subtotal: 28280,
      gst: 2828,
      total: 31108,
      status: "SENT",
      validUntil: addDays(new Date(), 25),
      sentAt: subDays(new Date(), 5),
      publicToken: "qt2026demo0001token",
      notes: "Quote based on site inspection conducted 15/04/2026. Price valid for 30 days. All work to AS/NZS 3000:2018.",
    },
  });

  const quote2 = await prisma.quote.upsert({
    where: { quoteNumber: "QT-2026-0002" },
    update: {},
    create: {
      userId: user.id,
      customerId: customers[1].id,
      quoteNumber: "QT-2026-0002",
      lineItems: [
        { description: "LED Downlight Replacement — supply & install", quantity: 12, unit: "ea", unitPrice: 165, includeGst: true, total: 1980 },
        { description: "Dimmer switches supply & install", quantity: 4, unit: "ea", unitPrice: 145, includeGst: true, total: 580 },
        { description: "Call-out & travel", quantity: 1, unit: "lump", unitPrice: 120, includeGst: true, total: 120 },
      ],
      subtotal: 2680,
      gst: 268,
      total: 2948,
      status: "DRAFT",
      validUntil: addDays(new Date(), 30),
      publicToken: "qt2026demo0002token",
    },
  });

  console.log("✅ Quotes created");

  // Create 1 invoice (overdue)
  await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-2026-0001" },
    update: {},
    create: {
      userId: user.id,
      jobId: job3.id,
      invoiceNumber: "INV-2026-0001",
      lineItems: [
        { description: "Labour — Commercial kitchen power install (2 electricians × 2 days)", quantity: 32, unit: "hr", unitPrice: 130, includeGst: true, total: 4160 },
        { description: "3-phase cable & conduit", quantity: 1, unit: "lump", unitPrice: 850, includeGst: true, total: 850 },
        { description: "Circuit breakers & isolation switches", quantity: 1, unit: "lump", unitPrice: 490, includeGst: true, total: 490 },
      ],
      subtotal: 5500,
      gst: 550,
      total: 6050,
      status: "OVERDUE",
      dueDate: subDays(new Date(), 8),
      notes: "Thank you for your business.",
    },
  });

  console.log("✅ Invoice created");

  // Create 1 SWMS
  await prisma.swms.upsert({
    where: { swmsNumber: "SWMS-2026-0001" },
    update: {},
    create: {
      userId: user.id,
      jobId: job1.id,
      swmsNumber: "SWMS-2026-0001",
      jobDescription: "Upgrade existing single-phase 60A switchboard to 3-phase 200A at residential premises.",
      highRiskWork: true,
      highRiskCategories: ["Work on or near energised electrical installations or services"],
      scopeOfWork: "This SWMS covers the isolation, removal and replacement of an existing single-phase 60A domestic switchboard with a new 3-phase 200A main switchboard (MSB). Work includes: isolation of supply at point of connection, removal of existing switchboard, installation of new 3-phase MSB, installation of RCDs and MCBs to current AS/NZS 3000 requirements, testing and commissioning, and restoration of supply.",
      hazards: [
        { id: "h1", hazard: "Contact with live electrical conductors", likelihood: "Medium", consequence: "High", initialRisk: "High", controls: ["Isolate and lock out at main switch", "Test dead with calibrated voltage tester", "Use insulated tools", "Wear arc flash PPE"], residualRisk: "Low", responsiblePerson: "Licensed Electrician" },
        { id: "h2", hazard: "Working in confined switchboard enclosure — restricted movement", likelihood: "Medium", consequence: "Medium", initialRisk: "Medium", controls: ["Ensure adequate lighting", "Take regular breaks", "Use appropriately sized tools"], residualRisk: "Low", responsiblePerson: "Site Electrician" },
        { id: "h3", hazard: "Arc flash from inadvertent short circuit", likelihood: "Low", consequence: "High", initialRisk: "Medium", controls: ["Full isolation and lockout/tagout procedure", "Arc flash rated face shield (Category 2)", "Insulated gloves Class 1 (1000V)", "No metallic items on person near live parts"], residualRisk: "Low", responsiblePerson: "Licensed Electrician" },
        { id: "h4", hazard: "Falls from ladder accessing high switchboard location", likelihood: "Low", consequence: "Medium", initialRisk: "Low", controls: ["Use AS/NZS 1892 compliant ladder", "Maintain 3-point contact", "Spotter present during ladder work"], residualRisk: "Low", responsiblePerson: "Site Supervisor" },
      ],
      ppe: [
        { id: "safety_glasses", label: "Safety Glasses", required: true },
        { id: "insulated_gloves", label: "Insulated Gloves (1000V)", required: true },
        { id: "arc_flash", label: "Arc Flash Protection", required: true },
        { id: "steel_caps", label: "Steel Cap Boots", required: true },
        { id: "hi_vis", label: "Hi-Vis Vest", required: true },
      ],
      emergencyProcedures: "In case of electrical emergency:\n1. Do NOT touch the person if they are in contact with electricity\n2. Call 000 immediately\n3. Isolate the power source from the main switch if safe to do so\n4. Apply CPR only when the person is clear of electrical source\n5. Nearest hospital: Manly Hospital, 1 Darley Rd, Manly NSW 2095\n6. Emergency contact: Jake Smith 0412 345 678\n\nIn case of fire:\n1. Evacuate all persons from the premises\n2. Call 000\n3. Do NOT use water on electrical fires — use CO2 extinguisher only",
      siteAddress: "42 Harbour View Drive, Manly NSW 2095",
      nearestHospital: "Manly Hospital, 1 Darley Rd, Manly NSW 2095",
      emergencyContact: "Jake Smith — 0412 345 678",
      status: "SIGNED",
      signedAt: subDays(new Date(), 2),
    },
  });

  console.log("✅ SWMS created");
  console.log("\n🎉 Seed complete! Demo data ready.");
  console.log("📧 Demo user email: demo@tradiemate.com.au");
  console.log("🔑 Update clerkId in User table to your Clerk user ID to activate demo data");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
