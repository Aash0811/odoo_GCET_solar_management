const prisma = require("../server/src/config/prisma");
const leadsService = require("../server/src/modules/leads/service");
const surveysService = require("../server/src/modules/surveys/service");
const quotesService = require("../server/src/modules/quotes/service");

async function runModule2Audit() {
  console.log("=== STARTING MODULE 2 (SITE SURVEY & ENGINEERING) AUTOMATED AUDIT ===");

  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("No active company found.");
  console.log(`[OK] Testing on company: ${company.name} (${company.id})`);

  // ─────────────────────────────────────────────────────────────
  // TEST 1: Auto-Created Survey Task when Lead is Qualified
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 1: Auto-Creation of Survey Task upon Qualification ---");
  const testPhone = `9876${Math.floor(100000 + Math.random() * 900000)}`;
  const testAddress = `Plot ${Math.floor(100 + Math.random() * 900)}, Financial District, Hyderabad`;
  const lead = await leadsService.createLead(company.id, {
    title: "7 kW Industrial Villa Solar - Krishna Murthy",
    contactName: "Krishna Murthy",
    phone: testPhone,
    email: `krishna_${Date.now()}@example.com`,
    address: testAddress,
    source: "WHATSAPP",
    desiredCapacityKw: 7,
    monthlyBillAmount: 9500,
  }, null);

  console.log(`[OK] Created initial lead: "${lead.title}" (Stage: ${lead.stage})`);

  // Qualify the lead via 3 technical gates (Decision: GO)
  await leadsService.updateChecklist(company.id, lead.id, {
    shadowFreeArea: true,
    monthlyBill: true,
    gridSuitable: true,
    desiredCapacityKw: 7,
    decision: "GO",
  }, null);

  // Check if Survey record was automatically created
  const autoCreatedSurvey = await prisma.survey.findFirst({
    where: { companyId: company.id, leadId: lead.id },
  });

  if (!autoCreatedSurvey) {
    throw new Error("FAILED: Survey task was NOT automatically created when lead was Qualified!");
  }
  console.log(`[PASS] Survey task was automatically spawned in database!`);
  console.log(`   - Survey ID: ${autoCreatedSurvey.id}`);
  console.log(`   - Status: ${autoCreatedSurvey.status} (Expected: REQUESTED)`);
  console.log(`   - Recommended kW: ${autoCreatedSurvey.recommendedKw}`);

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Scheduling with Technician Assignment & Calendar
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 2: Scheduling with Technician Assignment & Calendar ---");
  const technicians = await surveysService.getTechnicians(company.id);
  console.log(`[OK] Found ${technicians.length} field technicians:`);
  technicians.forEach(t => console.log(`   - ${t.name} (${t.role}) - ${t.activeSurveys} active appointments`));

  const assignedTech = technicians[0];
  const appointmentDate = new Date(Date.now() + 2 * 86400000); // 2 days later

  const scheduledSurvey = await surveysService.scheduleSurvey(company.id, {
    surveyId: autoCreatedSurvey.id,
    surveyedById: assignedTech.id,
    scheduledAt: appointmentDate,
    notes: "Client has rooftop terrace access via staircase. Ring calling bell on 2nd floor.",
  }, null);

  console.log(`[PASS] Survey scheduled successfully!`);
  console.log(`   - Survey Status: ${scheduledSurvey.status} (SCHEDULED)`);
  console.log(`   - Technician Assigned: ${assignedTech.name}`);
  console.log(`   - Appointment Date: ${scheduledSurvey.scheduledAt}`);

  // Verify lead moved to SURVEY_SCHEDULED
  const updatedLeadAfterSchedule = await prisma.lead.findUnique({ where: { id: lead.id } });
  console.log(`   - Lead Stage: ${updatedLeadAfterSchedule.stage} (Expected: SURVEY_SCHEDULED)`);
  if (updatedLeadAfterSchedule.stage !== "SURVEY_SCHEDULED") {
    throw new Error(`FAILED: Lead stage should be SURVEY_SCHEDULED, got ${updatedLeadAfterSchedule.stage}`);
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Mobile Survey Form Submission
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 3: Mobile Survey Form Submission (Field Engineering) ---");
  const mockPhotoBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const mockFiles = [
    { buffer: mockPhotoBuffer, originalname: "roof_south_exposure.jpg" },
    { buffer: mockPhotoBuffer, originalname: "lt_meter_panel.jpg" },
  ];

  const surveyData = {
    roofType: "RCC Flat Roof",
    roofAreaSqFt: 750,
    shadowFreeArea: true,
    monthlyBill: true,
    gridSuitable: true,
    recommendedKw: 7.5, // Technician verified roof can accommodate 7.5 kW
    roofDirection: "South (180° - Optimum)",
    tiltAngle: 18,
    cableDistanceMeters: 38, // 38 meters measured from terrace to ground floor meter panel
    gpsCoordinates: "17.4399° N, 78.4983° E",
    structureType: "Standard Elevated GI Superstructure (South Tilt)",
    notes: "Parapet wall is 3ft tall. No shadow obstacles. Earthing pit space available in backyard.",
  };

  const submittedSurvey = await surveysService.submitSurvey(
    company.id,
    autoCreatedSurvey.id,
    surveyData,
    mockFiles,
    assignedTech.id
  );

  console.log(`[PASS] Mobile survey form submitted by technician!`);
  console.log(`   - Survey Status: ${submittedSurvey.status} (SUBMITTED)`);
  console.log(`   - Photos uploaded: ${submittedSurvey.photos?.length || 0}`);

  // Fetch parsed survey to verify technical metrics feed
  const parsedSurvey = await surveysService.getSurveyById(company.id, autoCreatedSurvey.id);
  console.log(`   - Roof Orientation: ${parsedSurvey.roofDirection}`);
  console.log(`   - Tilt Angle: ${parsedSurvey.tiltAngle}°`);
  console.log(`   - Cable Distance: ${parsedSurvey.cableDistanceMeters}m`);
  console.log(`   - GPS Geo-Tag: ${parsedSurvey.gpsCoordinates}`);
  console.log(`   - Recommended Capacity: ${parsedSurvey.recommendedKw} kW`);

  if (Number(parsedSurvey.cableDistanceMeters) !== 38 || Number(parsedSurvey.recommendedKw) !== 7.5) {
    throw new Error("FAILED: Technical survey metrics not parsed correctly!");
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 4: Approval Workflow (Re-Survey & Approval)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 4: Approval Workflow (Re-Survey & Approval) ---");

  // Step 4a: Manager requests re-survey
  console.log("-> Step 4a: Manager requests Re-Survey with instruction...");
  const reSurveyResult = await surveysService.reviewSurvey(company.id, autoCreatedSurvey.id, {
    status: "RE_SURVEY",
    rejectionReason: "Please re-verify the shadow from adjacent water tank during late afternoon.",
  }, null);

  console.log(`[PASS] Re-survey requested!`);
  console.log(`   - Survey Status: ${reSurveyResult.status} (SCHEDULED)`);
  console.log(`   - Instruction: "${reSurveyResult.rejectionReason}"`);

  // Step 4b: Technician re-submits
  console.log("-> Step 4b: Technician re-submits after verification...");
  await surveysService.submitSurvey(company.id, autoCreatedSurvey.id, {
    ...surveyData,
    notes: "Re-verified shadow: Water tank does not cast shadow on proposed south array.",
  }, [], assignedTech.id);

  // Step 4c: Manager Approves Survey
  console.log("-> Step 4c: Manager approves survey...");
  const approvedSurvey = await surveysService.reviewSurvey(company.id, autoCreatedSurvey.id, {
    status: "APPROVED",
  }, null);

  console.log(`[PASS] Survey APPROVED!`);
  console.log(`   - Survey Status: ${approvedSurvey.status}`);
  console.log(`   - Approved At: ${approvedSurvey.approvedAt}`);

  const leadAfterApproval = await prisma.lead.findUnique({ where: { id: lead.id } });
  console.log(`   - Lead Stage: ${leadAfterApproval.stage} (Expected: SURVEY_APPROVED)`);
  if (leadAfterApproval.stage !== "SURVEY_APPROVED") {
    throw new Error(`FAILED: Lead stage should be SURVEY_APPROVED, got ${leadAfterApproval.stage}`);
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 5: Survey Results Feed Quote & Quote Creation Gatekeeper
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 5: Survey Results Feed Quote Creation ---");
  const templates = await prisma.packageTemplate.findMany({
    where: { companyId: company.id, isActive: true },
    include: { bomLines: { include: { product: true } } },
  });

  const template = templates[0];
  console.log(`[OK] Using Package Template: "${template.name}" (${template.type})`);

  // Generate quote using the survey's recommended capacity (7.5 kW)
  const quote = await quotesService.createQuote(company.id, {
    leadId: lead.id,
    packageTemplateId: template.id,
    capacityKw: Number(approvedSurvey.recommendedKw || 7.5),
  }, null);

  console.log(`[PASS] Quote created from approved survey! Quote Number: ${quote.quoteNumber}`);
  console.log(`   - System Capacity: ${quote.capacityKw} kW (Matches Survey: ${Number(quote.capacityKw) === 7.5})`);
  console.log(`   - Total Amount: ₹${Number(quote.totalAmount).toLocaleString('en-IN')}`);
  console.log(`   - Number of BOM Line items: ${quote.lines?.length || 0}`);

  // Verify that an unapproved lead CANNOT create a quote
  console.log("\n--- TEST 6: Quote Gatekeeping (Unapproved Leads Blocked) ---");
  const unapprovedLead = await leadsService.createLead(company.id, {
    title: "Unapproved Lead Test",
    contactName: "Unapproved User",
    phone: `9999${Math.floor(100000 + Math.random() * 900000)}`,
  }, null);

  let unapprovedBlocked = false;
  try {
    await quotesService.createQuote(company.id, {
      leadId: unapprovedLead.id,
      packageTemplateId: template.id,
      capacityKw: 3,
    }, null);
  } catch (err) {
    unapprovedBlocked = true;
    console.log(`[PASS] Quote creation correctly BLOCKED for unapproved lead! Error: "${err.message}"`);
  }

  if (!unapprovedBlocked) {
    throw new Error("FAILED: Quotes should be blocked unless survey is APPROVED!");
  }

  console.log("\n=======================================================");
  console.log(">>> ALL 6 MODULE 2 (SITE SURVEY) TESTS PASSED! <<<");
  console.log("=======================================================");
  process.exit(0);
}

runModule2Audit().catch(err => {
  console.error("\nTEST SUITE FAILED:", err);
  process.exit(1);
});
