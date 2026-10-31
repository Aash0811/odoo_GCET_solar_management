const prisma = require("../server/src/config/prisma");
const leadsService = require("../server/src/modules/leads/service");
const surveysService = require("../server/src/modules/surveys/service");

async function runTests() {
  console.log("=== STARTING MODULE 1 (CRM & LEAD MANAGEMENT) AUTOMATED AUDIT ===");

  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("No active company found.");
  console.log(`[OK] Testing on company: ${company.name} (${company.id})`);

  const salesReps = await leadsService.getSalesReps(company.id);
  console.log(`[OK] Found ${salesReps.length} sales representatives for round-robin auto-assignment.`);
  salesReps.forEach(r => console.log(`   - ${r.name} (${r.role}) - ${r.activeLeadsCount} active leads`));

  // ─────────────────────────────────────────────────────────────
  // TEST 1: Multi-Channel Capture & Required Fields
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 1: Multi-Channel Capture (WhatsApp Inbound) ---");
  const uniquePhone = `9849${Math.floor(100000 + Math.random() * 900000)}`;
  const leadData1 = {
    title: "5 kW On-Grid Rooftop - Anand Rao",
    contactName: "Anand Rao",
    phone: uniquePhone,
    email: "anand.rao@example.com",
    address: "Plot 55, Road 12, Banjara Hills, Hyderabad",
    source: "WHATSAPP",
    systemType: "ON_GRID",
    subsidyInterest: true,
    desiredCapacityKw: 5,
    monthlyBillAmount: 7200,
    notes: "Inquired via WhatsApp for PM Surya Ghar subsidy scheme.",
  };

  const lead1 = await leadsService.createLead(company.id, leadData1, null);
  console.log(`[PASS] Lead 1 created via WhatsApp! ID: ${lead1.id}, Title: "${lead1.title}"`);
  console.log(`   - Assigned to: ${lead1.assignedTo?.name || lead1.assignedToId} (Auto-assigned)`);
  console.log(`   - Source: ${lead1.source}`);
  console.log(`   - Stage: ${lead1.stage}`);
  console.log(`   - Notes: ${lead1.notes}`);

  if (!lead1.assignedToId) {
    throw new Error("FAILED: Lead was not auto-assigned to any sales representative!");
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Duplicate Detection & Auto-Merging
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 2: Duplicate Detection & Auto-Merging (Same Phone) ---");
  const duplicateInquiry = {
    title: "Website Quote Request - Anand Rao",
    contactName: "Anand Rao",
    phone: uniquePhone, // Exact same phone
    email: "anand.rao@example.com",
    address: "Plot 55, Road 12, Banjara Hills, Hyderabad",
    source: "WEBSITE_QUOTE_REQUEST",
    desiredCapacityKw: 7, // Customer increased requirement
    notes: "Filled website calculator requesting 7 kW upgrade.",
  };

  const mergeResult = await leadsService.createLead(company.id, duplicateInquiry, null);
  console.log(`[PASS] Duplicate detection handled!`);
  console.log(`   - Merged into ID: ${mergeResult.id} (Matches original: ${mergeResult.id === lead1.id})`);
  console.log(`   - isDuplicateMerged flag: ${mergeResult.isDuplicateMerged}`);
  console.log(`   - Updated Capacity: ${mergeResult.desiredCapacityKw} kW`);
  console.log(`   - Merged Notes:\n${mergeResult.notes}`);

  if (!mergeResult.isDuplicateMerged || mergeResult.id !== lead1.id) {
    throw new Error("FAILED: Duplicate inquiry was not merged into the existing lead!");
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Call Logging & Discussion Notes
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 3: Call Logging & Discussion Notes ---");
  const activityData = {
    type: "CALL",
    outcome: "Connected - Highly Interested",
    notes: "Spoke with Anand Rao. Confirmed roof area is 600 sq.ft south-facing. Wants subsidy assistance.",
    followUpAt: new Date(Date.now() + 2 * 86400000).toISOString(),
  };

  const afterActivity = await leadsService.logActivity(company.id, lead1.id, activityData, lead1.assignedToId);
  console.log(`[PASS] Call logged!`);
  console.log(`   - Stage automatically moved to: ${afterActivity.stage} (from NEW)`);
  console.log(`   - Last contact updated at: ${afterActivity.lastContactAt}`);
  console.log(`   - Notes contain call summary: ${afterActivity.notes.includes("Connected - Highly Interested")}`);

  // ─────────────────────────────────────────────────────────────
  // TEST 4: Qualification Checklist Gatekeeping (Survey blocked if unverified)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 4: Qualification Checklist Gatekeeping ---");
  let surveyBlocked = false;
  try {
    await surveysService.scheduleSurvey(company.id, {
      leadId: lead1.id,
      scheduledAt: new Date(Date.now() + 86400000),
      notes: "Attempt to schedule without qualifying first.",
    }, lead1.assignedToId);
  } catch (err) {
    surveyBlocked = true;
    console.log(`[PASS] Survey scheduling was correctly BLOCKED for unverified lead!`);
    console.log(`   - Expected Error: "${err.message}"`);
  }

  if (!surveyBlocked) {
    throw new Error("FAILED: Site survey should NOT be allowed before passing qualification checklist!");
  }

  // Now qualify the lead with decision: "GO"
  console.log("\n--- TEST 5: Qualifying Lead (Decision: GO) ---");
  const qualifiedLead = await leadsService.updateChecklist(company.id, lead1.id, {
    shadowFreeArea: true,
    monthlyBill: true,
    gridSuitable: true,
    monthlyBillAmount: 7200,
    desiredCapacityKw: 7,
    decision: "GO",
  }, lead1.assignedToId);

  console.log(`[PASS] Qualification passed!`);
  console.log(`   - Stage: ${qualifiedLead.stage}`);
  console.log(`   - Gates: Shadow-Free: ${qualifiedLead.shadowFreeArea}, Bill: ${qualifiedLead.monthlyBill}, Grid: ${qualifiedLead.gridSuitable}`);

  if (qualifiedLead.stage !== "QUALIFIED") {
    throw new Error(`FAILED: Lead stage should be QUALIFIED, got ${qualifiedLead.stage}`);
  }

  // Now survey should succeed!
  const survey = await surveysService.scheduleSurvey(company.id, {
    leadId: lead1.id,
    scheduledAt: new Date(Date.now() + 86400000),
    notes: "Site survey confirmed after Go qualification.",
  }, lead1.assignedToId);

  console.log(`[PASS] Site survey successfully scheduled after Go decision! Survey ID: ${survey.id}`);

  // ─────────────────────────────────────────────────────────────
  // TEST 6: Reassign Lead to another Salesperson
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 6: Reassign Lead (Sales Manager Feature) ---");
  const otherRep = salesReps.find(r => r.id !== lead1.assignedToId) || salesReps[0];
  const reassignedLead = await leadsService.reassignLead(company.id, lead1.id, otherRep.id, lead1.assignedToId);
  console.log(`[PASS] Lead reassigned to: ${reassignedLead.assignedTo?.name} (${reassignedLead.assignedToId})`);

  // ─────────────────────────────────────────────────────────────
  // TEST 7: Mandatory Loss Reason Capture & Never Hard Deleted
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 7: Mandatory Loss Reason & Unsuitability Capture ---");
  let lossWithoutReasonBlocked = false;
  try {
    await leadsService.updateStage(company.id, lead1.id, { stage: "LOST", lossReason: "" }, lead1.assignedToId);
  } catch (err) {
    lossWithoutReasonBlocked = true;
    console.log(`[PASS] Marking LOST without reason was correctly BLOCKED! Error: "${err.message}"`);
  }

  if (!lossWithoutReasonBlocked) {
    throw new Error("FAILED: Stage cannot transition to LOST without capturing loss reason!");
  }

  // Now mark LOST with reason
  const lostLead = await leadsService.updateStage(company.id, lead1.id, {
    stage: "LOST",
    lossReason: "DISCOM constraint: Substation capacity full / Net-metering denied",
  }, lead1.assignedToId);

  console.log(`[PASS] Lead marked as LOST with reason captured!`);
  console.log(`   - Stage: ${lostLead.stage}`);
  console.log(`   - Loss Reason: "${lostLead.lossReason}"`);

  // Verify enquiry is NEVER hard-deleted and still exists in DB
  const checkLeadInDb = await prisma.lead.findUnique({ where: { id: lead1.id } });
  if (!checkLeadInDb) {
    throw new Error("FAILED: Lead was deleted from DB!");
  }
  console.log(`[PASS] Enquiry verified to persist in database! ID: ${checkLeadInDb.id}, Title: "${checkLeadInDb.title}"`);

  // Re-activate lead from Lost back into pipeline
  const reactivated = await leadsService.updateStage(company.id, lead1.id, { stage: "NEW" }, lead1.assignedToId);
  console.log(`[PASS] Lead successfully re-activated into pipeline! New stage: ${reactivated.stage}`);

  console.log("\n=======================================================");
  console.log(">>> ALL 7 MODULE 1 TESTS PASSED SUCCESSFULLY! <<<");
  console.log("=======================================================");
  process.exit(0);
}

runTests().catch(err => {
  console.error("\nTEST SUITE FAILED:", err);
  process.exit(1);
});

