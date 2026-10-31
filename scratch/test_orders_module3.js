const prisma = require("../server/src/config/prisma");
const leadsService = require("../server/src/modules/leads/service");
const surveysService = require("../server/src/modules/surveys/service");
const quotesService = require("../server/src/modules/quotes/service");
const ordersService = require("../server/src/modules/orders/service");

async function runModule3Audit() {
  console.log("=== STARTING MODULE 3 (GETTING THE KIT RIGHT & SALES ORDERS) AUTOMATED AUDIT ===");

  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("No active company found.");
  console.log(`[OK] Testing on company: ${company.name} (${company.id})`);

  // ─────────────────────────────────────────────────────────────
  // SETUP: Create a Lead, Qualify, and Approve Survey (Modules 1 & 2)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- SETUP: Preparing Survey-Approved Lead ---");
  const testPhone = `9876${Math.floor(100000 + Math.random() * 900000)}`;
  const testAddress = `Plot ${Math.floor(100 + Math.random() * 900)}, Jubilee Hills, Hyderabad`;

  const lead = await leadsService.createLead(company.id, {
    title: "5 kW Residential Rooftop Solar - Ananya Sharma",
    contactName: "Ananya Sharma",
    phone: testPhone,
    email: `ananya_${Date.now()}@example.com`,
    address: testAddress,
    source: "WEB_FORM",
    desiredCapacityKw: 5,
    monthlyBillAmount: 7200,
  }, null);

  // Qualify the lead
  await leadsService.updateChecklist(company.id, lead.id, {
    shadowFreeArea: true,
    monthlyBill: true,
    gridSuitable: true,
    desiredCapacityKw: 5,
    decision: "GO",
  }, null);

  // Fetch auto-created survey
  const survey = await prisma.survey.findFirst({
    where: { companyId: company.id, leadId: lead.id },
  });

  // Technician submits survey measurements
  await surveysService.submitSurvey(company.id, survey.id, {
    roofType: "RCC Flat Terrace",
    roofAreaSqFt: 550,
    shadowFreeArea: true,
    monthlyBill: true,
    gridSuitable: true,
    recommendedKw: 5,
    roofDirection: "South (180°)",
    tiltAngle: 18,
    cableDistanceMeters: 32,
    gpsCoordinates: "17.4300° N, 78.4000° E",
    notes: "Terrace clear of obstructions. ACDB/DCDB space identified on 1st floor landing.",
  }, [], null);

  // Manager approves survey
  await surveysService.reviewSurvey(company.id, survey.id, {
    status: "APPROVED",
  }, null);

  console.log(`[OK] Lead prepared and Survey APPROVED for ${lead.contactName}`);

  // ─────────────────────────────────────────────────────────────
  // TEST 1: Ready Package Templates & Scaled Dynamic BOM
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 1: Package Templates & Scaled Dynamic BOM ---");
  const templates = await prisma.packageTemplate.findMany({
    where: { companyId: company.id, isActive: true },
    include: {
      bomLines: {
        include: { product: true },
      },
    },
  });

  if (!templates || templates.length === 0) {
    throw new Error("FAILED: No active Package Templates found in database!");
  }

  console.log(`[PASS] Found ${templates.length} active Package Templates:`);
  templates.forEach(t => console.log(`   - "${t.name}" (${t.type}) - ${t.bomLines.length} default BOM line rules`));

  const selectedTemplate = templates.find(t => t.type === "ON_GRID") || templates[0];
  console.log(`[OK] Selected Template for 5 kW System: "${selectedTemplate.name}"`);

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Official Quotation Generation with GST & Subsidy Note
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 2: Official Quotation Generation ---");
  const quote = await quotesService.createQuote(company.id, {
    leadId: lead.id,
    packageTemplateId: selectedTemplate.id,
    capacityKw: 5,
    discountAmount: 5000,
  }, null);

  console.log(`[PASS] Quotation Generated: ${quote.quoteNumber}`);
  console.log(`   - Customer: ${quote.customer.name}`);
  console.log(`   - Capacity: ${quote.capacityKw} kW`);
  console.log(`   - Subtotal: ₹${Number(quote.subtotal).toLocaleString('en-IN')}`);
  console.log(`   - Discount: ₹${Number(quote.discountAmount).toLocaleString('en-IN')}`);
  console.log(`   - GST 18%: ₹${Number(quote.gstAmount).toLocaleString('en-IN')}`);
  console.log(`   - Total Payable: ₹${Number(quote.totalAmount).toLocaleString('en-IN')}`);
  console.log(`   - Subsidy Note: "${quote.subsidyNote}"`);
  console.log(`   - Number of BOM Items: ${quote.lines?.length || 0}`);

  if (!quote.lines || quote.lines.length === 0) {
    throw new Error("FAILED: Quotation has no BOM line items!");
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Server-Side PDFKit Quotation Export
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 3: Server-Side PDFKit Quotation Export ---");
  const pdfBuffer = await quotesService.getQuotePdfBuffer(company.id, quote.id);
  console.log(`[PASS] Quotation PDF generated successfully! Size: ${pdfBuffer.length} bytes`);
  if (!pdfBuffer || pdfBuffer.length < 500) {
    throw new Error("FAILED: PDF Buffer is too small or invalid!");
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 4: Sales Order Conversion (Pending Payment)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 4: Sales Order Conversion ---");
  const salesOrder = await ordersService.createOrderFromQuote(company.id, {
    quoteId: quote.id,
    notes: "Customer confirmed via phone call after reviewing PDF proposal.",
  }, null);

  console.log(`[PASS] Sales Order Created: ${salesOrder.orderNumber}`);
  console.log(`   - Initial Status: ${salesOrder.status} (Expected: PENDING_PAYMENT)`);
  console.log(`   - Total Order Value: ₹${Number(salesOrder.totalAmount).toLocaleString('en-IN')}`);

  // Verify lead stage updated to WON and quote status updated to ACCEPTED
  const updatedLeadAfterOrder = await prisma.lead.findUnique({ where: { id: lead.id } });
  const updatedQuoteAfterOrder = await prisma.quote.findUnique({ where: { id: quote.id } });
  console.log(`   - Lead Stage: ${updatedLeadAfterOrder.stage} (Expected: WON)`);
  console.log(`   - Quote Status: ${updatedQuoteAfterOrder.status} (Expected: ACCEPTED)`);

  if (salesOrder.status !== "PENDING_PAYMENT" || updatedLeadAfterOrder.stage !== "WON" || updatedQuoteAfterOrder.status !== "ACCEPTED") {
    throw new Error("FAILED: Sales order conversion did not set expected statuses!");
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 5: Business Rule 4 — Atomic Milestone Advance Confirmation
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 5: Business Rule 4 — Milestone Advance & Atomic Auto-Triggers ---");
  const advanceAmount = Math.round(Number(salesOrder.totalAmount) * 0.20); // 20% advance
  const installDate = new Date(Date.now() + 4 * 86400000); // 4 days later

  const confirmResult = await ordersService.recordPaymentAndConfirm(
    company.id,
    salesOrder.id,
    {
      amount: advanceAmount,
      method: "UPI",
      transactionRef: `UPI-ADV-${Date.now()}`,
      notes: "20% Milestone Booking Advance received via UPI QR",
      scheduledInstallDate: installDate,
    },
    null
  );

  console.log(`[PASS] Milestone advance payment recorded: ₹${advanceAmount.toLocaleString('en-IN')}`);
  console.log(`   - Order Status: ${confirmResult.order.status} (Expected: CONFIRMED)`);
  console.log(`   - Confirmed At: ${confirmResult.order.confirmedAt}`);

  // Verify Warehouse PickList was auto-generated
  const pickList = confirmResult.pickList;
  if (!pickList) throw new Error("FAILED: Warehouse PickList was NOT created upon confirmation!");
  console.log(`   - Warehouse Pick List Auto-Spawned: ${pickList.pickNumber} (Status: ${pickList.status})`);
  console.log(`   - Pick Lines Generated: ${pickList.lines?.length || 0} hardware items`);

  // Verify Installation Job was auto-scheduled on calendar
  const installJob = confirmResult.installationJob;
  if (!installJob) throw new Error("FAILED: Installation Job was NOT scheduled upon confirmation!");
  console.log(`   - Installation Job Auto-Spawned: ${installJob.jobNumber} (Status: ${installJob.status})`);
  console.log(`   - Scheduled On Calendar: ${installJob.scheduledAt}`);
  console.log(`   - Confirmed System kW: ${installJob.confirmedKw}`);

  // Verify In-App Notifications were dispatched
  const notifications = await prisma.notification.findMany({
    where: {
      companyId: company.id,
      entityId: { in: [pickList.id, installJob.id] },
    },
  });
  console.log(`   - Automated Notifications Dispatched: ${notifications.length} team alerts`);
  notifications.forEach(n => console.log(`      * [${n.type}] ${n.title}: "${n.message}"`));

  // ─────────────────────────────────────────────────────────────
  // TEST 6: Subsequent Milestone / Balance Payment
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 6: Subsequent Payments Handling ---");
  const remainingBalance = Number(salesOrder.totalAmount) - advanceAmount;
  const secondPaymentResult = await ordersService.recordPaymentAndConfirm(
    company.id,
    salesOrder.id,
    {
      amount: remainingBalance,
      method: "BANK_TRANSFER",
      transactionRef: `NEFT-${Date.now()}`,
      notes: "Remaining 80% balance payment prior to commissioning",
    },
    null
  );

  console.log(`[PASS] Second payment recorded: ₹${remainingBalance.toLocaleString('en-IN')}`);
  const allPayments = await prisma.payment.findMany({ where: { orderId: salesOrder.id } });
  console.log(`   - Total Payments Recorded: ${allPayments.length}`);
  const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  console.log(`   - Sum of Payments: ₹${totalPaid.toLocaleString('en-IN')} (Matches Order Total: ${totalPaid === Number(salesOrder.totalAmount)})`);

  // Verify that pickList and installationJob were NOT re-created
  const totalPickLists = await prisma.pickList.count({ where: { orderId: salesOrder.id } });
  const totalJobs = await prisma.installationJob.count({ where: { orderId: salesOrder.id } });
  console.log(`   - PickLists for Order: ${totalPickLists} (Expected: 1)`);
  console.log(`   - InstallationJobs for Order: ${totalJobs} (Expected: 1)`);

  if (totalPickLists !== 1 || totalJobs !== 1) {
    throw new Error("FAILED: Redundant pick list or installation job created on subsequent payment!");
  }

  console.log("\n========================================================================");
  console.log(">>> ALL 6 MODULE 3 (GETTING THE KIT RIGHT & ORDERS) TESTS PASSED! <<<");
  console.log("========================================================================");
  process.exit(0);
}

runModule3Audit().catch(err => {
  console.error("\nTEST SUITE FAILED:", err);
  process.exit(1);
});

