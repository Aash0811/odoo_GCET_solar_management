const prisma = require("../server/src/config/prisma");
const leadsService = require("../server/src/modules/leads/service");
const surveysService = require("../server/src/modules/surveys/service");
const quotesService = require("../server/src/modules/quotes/service");

async function runQuotationModuleAudit() {
  console.log("================================================================================");
  console.log("    QUOTATION MANAGEMENT MODULE — COMPREHENSIVE VERIFICATION & AUDIT");
  console.log("================================================================================\n");

  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("No active company found.");
  console.log(`[OK] Testing in Company: "${company.name}" (ID: ${company.id})\n`);

  const adminUser = await prisma.user.findFirst({ where: { companyId: company.id, role: "ADMIN" } });
  const salesUser = await prisma.user.findFirst({ where: { companyId: company.id, role: "SALESMAN" } }) || adminUser;

  // ─────────────────────────────────────────────────────────────
  // SETUP: Create a Lead for testing
  // ─────────────────────────────────────────────────────────────
  const uniqueId = Date.now();
  const testPhone = `9811${Math.floor(100000 + Math.random() * 900000)}`;
  const testAddress = `Villa ${Math.floor(100 + Math.random() * 900)}, Green Meadows Sector ${uniqueId % 100}, Hyderabad`;
  const lead = await leadsService.createLead(
    company.id,
    {
      title: `3 kW On-Grid Solar System - Dr. Ramanathan ${uniqueId}`,
      contactName: `Dr. Ramanathan ${uniqueId}`,
      phone: testPhone,
      email: `ramanathan_${uniqueId}@example.com`,
      address: testAddress,
      source: "WEBSITE",
      desiredCapacityKw: 3,
      monthlyBillAmount: 4800,
    },
    adminUser?.id
  );
  console.log(`[SETUP] Created test lead: "${lead.title}" (ID: ${lead.id})`);

  // Find 3 kW On-Grid package template
  let pkg3kW = await prisma.packageTemplate.findFirst({
    where: { companyId: company.id, defaultCapacityKw: 3, type: "ON_GRID" },
    include: { bomLines: { include: { product: true } } },
  });

  if (!pkg3kW) {
    // If exact 3kW not found, get any on-grid package
    pkg3kW = await prisma.packageTemplate.findFirst({
      where: { companyId: company.id },
      include: { bomLines: { include: { product: true } } },
    });
  }

  if (!pkg3kW) throw new Error("No package template found in database.");
  console.log(`[SETUP] Found package template: "${pkg3kW.name}" with ${pkg3kW.bomLines.length} BOM components\n`);

  // ─────────────────────────────────────────────────────────────
  // TEST 1: Business Rule 2 Enforcement
  // (A Quote CANNOT be created unless the lead's Survey is APPROVED)
  // ─────────────────────────────────────────────────────────────
  console.log("--- TEST 1: Rule 2 Enforcement (Block quote creation without Approved Survey) ---");
  let blockedAsExpected = false;
  try {
    await quotesService.createQuote(
      company.id,
      {
        leadId: lead.id,
        packageTemplateId: pkg3kW.id,
        capacityKw: 3,
      },
      salesUser.id
    );
  } catch (err) {
    blockedAsExpected = true;
    console.log(`[PASS] Quote creation correctly blocked with message: "${err.message}"`);
  }

  if (!blockedAsExpected) {
    throw new Error("FAILED: Business Rule 2 was violated! Quote was created without an approved survey.");
  }

  // Now qualify the lead and create + approve survey
  await leadsService.updateChecklist(
    company.id,
    lead.id,
    {
      shadowFreeArea: true,
      monthlyBill: true,
      gridSuitable: true,
      desiredCapacityKw: 3,
      decision: "GO",
    },
    adminUser.id
  );

  const survey = await prisma.survey.findFirst({
    where: { companyId: company.id, leadId: lead.id },
  });
  if (!survey) throw new Error("Auto-survey creation failed.");

  // Submit survey with engineering details
  await surveysService.submitSurvey(company.id, survey.id, {
    roofType: "RCC_FLAT",
    shadowFreeAreaSqFt: 350,
    tiltAngleDeg: 15,
    roofDirection: "SOUTH",
    cableDistanceMeters: 25,
    recommendedKw: 3,
    remarks: "Ideal south-facing terrace, unobstructed sun.",
  });

  // Approve survey
  await surveysService.reviewSurvey(company.id, survey.id, {
    status: "APPROVED",
    notes: "Structural integrity and grid suitability verified.",
  }, adminUser.id);
  console.log(`[PASS] Lead qualified and survey #${survey.id} moved to APPROVED status.\n`);

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Template-Driven Auto-BOM Explosion for 3 kW On-Grid
  // ─────────────────────────────────────────────────────────────
  console.log("--- TEST 2: Template-Driven Auto-BOM Explosion for 3 kW On-Grid ---");
  const quote = await quotesService.createQuote(
    company.id,
    {
      leadId: lead.id,
      packageTemplateId: pkg3kW.id,
      capacityKw: 3,
      discountAmount: 5000, // Within auto limit of ₹10,000
      validDays: 30,
      subsidyNote: "PM Surya Ghar National Rooftop Programme DBT Subsidy",
    },
    salesUser.id
  );

  console.log(`[PASS] Quotation created: ${quote.quoteNumber} (ID: ${quote.id})`);
  console.log(`   - Status: ${quote.status} (Expected: DRAFT)`);
  console.log(`   - System Capacity: ${quote.capacityKw} kW`);
  console.log(`   - Version: v${quote.version}`);
  console.log(`   - Subtotal: ₹${Number(quote.subtotal).toLocaleString('en-IN')}`);
  console.log(`   - Discount: ₹${Number(quote.discountAmount).toLocaleString('en-IN')}`);
  console.log(`   - GST (18%): ₹${Number(quote.gstAmount).toLocaleString('en-IN')}`);
  console.log(`   - Total Amount: ₹${Number(quote.totalAmount).toLocaleString('en-IN')}`);
  console.log(`   - Parts list auto-exploded into ${quote.lines.length} BOM line items:`);

  quote.lines.forEach((l, i) => {
    console.log(`     ${i + 1}. [Qty: ${l.quantity}] ${l.description} — ₹${Number(l.lineTotal).toLocaleString('en-IN')}`);
  });

  if (quote.lines.length === 0) {
    throw new Error("FAILED: Parts list did not explode from Package BOM!");
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Central Subsidy Calculation & Net Payable
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 3: Central Subsidy Calculation & Net Payable ---");
  console.log(`[PASS] Subsidy Amount calculated: ₹${Number(quote.subsidyAmount).toLocaleString('en-IN')}`);
  console.log(`   - Expected: ₹78,000 for 3 kW+ system`);
  console.log(`   - Net Payable Post Subsidy: ₹${Number(quote.netPayable).toLocaleString('en-IN')}`);
  console.log(`   - Subsidy Note: "${quote.subsidyNote}"`);

  if (Number(quote.subsidyAmount) !== 78000) {
    throw new Error(`FAILED: Expected subsidy ₹78,000 for 3 kW, got ₹${quote.subsidyAmount}`);
  }

  const expectedNetPayable = Math.max(0, Number(quote.totalAmount) - Number(quote.subsidyAmount));
  if (Math.abs(Number(quote.netPayable) - expectedNetPayable) > 1) {
    throw new Error(`FAILED: Net payable calculation mismatch! Expected ₹${expectedNetPayable}, got ₹${quote.netPayable}`);
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 4: Editable Lines (Panel brand swap & extra cable length) with Version Increment
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 4: Editable Lines & Version Increment (v1 -> v2) with Audit Log ---");

  // Fetch products for swap
  const allProducts = await prisma.product.findMany({ where: { companyId: company.id } });
  const premiumPanel = allProducts.find(p => p.category === "PANEL" && p.sku.includes("BIFACIAL")) || allProducts.find(p => p.category === "PANEL");
  const cableProduct = allProducts.find(p => p.category === "CABLE");

  // Create modified lines: swap panel description/sku and increase cable from 25 to 45 meters
  const modifiedLines = quote.lines.map(l => {
    if (l.productId === cableProduct?.id || l.description.toLowerCase().includes("cable") || l.description.toLowerCase().includes("wire")) {
      return {
        ...l,
        quantity: 45, // Extra 20m from site survey
        lineTotal: 45 * Number(l.unitPrice),
      };
    }
    if (l.productId === premiumPanel?.id || l.description.toLowerCase().includes("panel")) {
      return {
        ...l,
        description: `${premiumPanel.name} (Bifacial High Efficiency Upgrade)`,
        unitPrice: Number(premiumPanel.salePrice),
        lineTotal: Number(l.quantity) * Number(premiumPanel.salePrice),
      };
    }
    return l;
  });

  const updatedQuoteV2 = await quotesService.updateQuoteLines(
    company.id,
    quote.id,
    {
      customLines: modifiedLines,
      notes: "Upgraded to Bifacial panels and added 20m extra DC cabling based on site survey engineering findings.",
    },
    salesUser.id
  );

  console.log(`[PASS] Quote updated successfully to Version: v${updatedQuoteV2.version}`);
  console.log(`   - Previous version: v${quote.version} -> New version: v${updatedQuoteV2.version}`);
  console.log(`   - New Total Amount: ₹${Number(updatedQuoteV2.totalAmount).toLocaleString('en-IN')}`);
  console.log(`   - New Net Payable: ₹${Number(updatedQuoteV2.netPayable).toLocaleString('en-IN')}`);

  if (updatedQuoteV2.version !== 2) {
    throw new Error(`FAILED: Expected version to increment to 2, got ${updatedQuoteV2.version}`);
  }

  // Check AuditLog for version 2 update
  const auditEntry = await prisma.auditLog.findFirst({
    where: {
      companyId: company.id,
      entityType: "Quote",
      entityId: quote.id,
      action: "UPDATE",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!auditEntry) {
    throw new Error("FAILED: AuditLog did not record the line items modification!");
  }
  console.log(`[PASS] Change audit recorded in database: Action "${auditEntry.action}" by actor ID ${auditEntry.actorId}`);

  // ─────────────────────────────────────────────────────────────
  // TEST 5: Discount Limits & Approval Threshold (> ₹10,000)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 5: Discount Limits & Manager Approval Gate (> ₹10,000) ---");
  const highDiscountAmount = 15000; // Greater than ₹10,000 threshold

  const quoteHighDiscount = await quotesService.updateQuoteLines(
    company.id,
    quote.id,
    {
      customLines: modifiedLines,
      discountAmount: highDiscountAmount,
      notes: "Customer requesting special festive seasonal discount of ₹15,000.",
    },
    salesUser.id
  );

  console.log(`[PASS] High discount of ₹${highDiscountAmount.toLocaleString('en-IN')} applied.`);
  console.log(`   - Status: ${quoteHighDiscount.status} (Expected: PENDING_APPROVAL)`);
  console.log(`   - Discount Approval Required: ${quoteHighDiscount.discountApprovalRequired}`);
  console.log(`   - Discount Approved: ${quoteHighDiscount.discountApproved}`);

  if (quoteHighDiscount.status !== "PENDING_APPROVAL" || !quoteHighDiscount.discountApprovalRequired || quoteHighDiscount.discountApproved) {
    throw new Error("FAILED: High discount quote did not enter PENDING_APPROVAL state!");
  }

  // Verify that customer acceptance is BLOCKED while pending discount approval
  let acceptBlocked = false;
  try {
    await quotesService.acceptQuote(company.id, quote.id, { notes: "Trying to accept early" });
  } catch (err) {
    acceptBlocked = true;
    console.log(`[PASS] Customer acceptance blocked as expected: "${err.message}"`);
  }

  if (!acceptBlocked) {
    throw new Error("FAILED: Customer was able to accept a quote with unapproved high discount!");
  }

  // Manager reviews and approves discount
  const approvedQuote = await quotesService.reviewDiscount(
    company.id,
    quote.id,
    { approved: true, notes: "Approved by Sales Manager under festive quota." },
    adminUser.id
  );

  console.log(`[PASS] Manager reviewed and approved discount.`);
  console.log(`   - Status: ${approvedQuote.status} (Expected: DRAFT)`);
  console.log(`   - Discount Approved: ${approvedQuote.discountApproved}`);
  console.log(`   - Discount Approved By: ${approvedQuote.discountApprovedById}`);

  if (!approvedQuote.discountApproved || approvedQuote.status !== "DRAFT") {
    throw new Error("FAILED: Discount approval did not unlock quote status!");
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 6: Public Share-Link & Customer Online Acceptance Record
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 6: Public Share Link & Digital Customer Acceptance ---");
  console.log(`[PASS] Unique Share Token generated: ${approvedQuote.shareToken}`);
  console.log(`   - Shareable Portal URL: /shared-quote/${approvedQuote.shareToken}`);

  // Test public unauthenticated read
  const publicQuoteView = await quotesService.getQuoteByShareToken(approvedQuote.shareToken);
  console.log(`[PASS] Unauthenticated public retrieval successful for quote #${publicQuoteView.quoteNumber}`);
  console.log(`   - Customer: ${publicQuoteView.customer.name}`);
  console.log(`   - Total lines: ${publicQuoteView.lines.length}`);

  // Customer accepts online with digital signature and IP
  const signatureDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const acceptedQuote = await quotesService.acceptQuote(
    null,
    approvedQuote.shareToken,
    {
      signature: signatureDataUrl,
      notes: "Accepted digitally by Dr. Ramanathan. Ready for roof structure installation.",
    },
    {
      headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" },
      socket: { remoteAddress: "203.0.113.195" },
    }
  );

  console.log(`[PASS] Quote status updated to: ${acceptedQuote.status} (Expected: ACCEPTED)`);
  console.log(`   - Accepted At: ${acceptedQuote.acceptedAt}`);
  console.log(`   - Acceptance IP: ${acceptedQuote.acceptanceIp}`);
  console.log(`   - Acceptance User Agent: ${acceptedQuote.acceptanceUserAgent}`);
  console.log(`   - Acceptance Notes: "${acceptedQuote.acceptanceNotes}"`);
  console.log(`   - Digital Signature captured: ${Boolean(acceptedQuote.acceptanceSignature)} (${acceptedQuote.acceptanceSignature?.slice(0, 30)}...)`);

  if (acceptedQuote.status !== "ACCEPTED" || !acceptedQuote.acceptanceSignature || !acceptedQuote.acceptanceIp) {
    throw new Error("FAILED: Digital acceptance record was incomplete!");
  }

  // Verify lead stage automatically moved to WON
  const updatedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
  console.log(`[PASS] Lead stage automatically updated to: ${updatedLead.stage} (Expected: WON)`);
  if (updatedLead.stage !== "WON") {
    throw new Error(`FAILED: Lead stage was expected to be WON, got ${updatedLead.stage}`);
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 7: Gross Margin Preview — Internal Only Privacy Check
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 7: Gross Margin Preview & Data Privacy (Manager vs Sales/Customer) ---");

  // Admin / Director / Manager view
  const adminView = await quotesService.getQuoteById(company.id, quote.id, "ADMIN");
  console.log(`[PASS] Admin / Manager View:`);
  console.log(`   - Subtotal: ₹${adminView.subtotal.toLocaleString('en-IN')}`);
  console.log(`   - Total Cost: ₹${adminView.totalCost.toLocaleString('en-IN')}`);
  console.log(`   - Margin Amount: ₹${adminView.marginAmount.toLocaleString('en-IN')}`);
  console.log(`   - Margin Percentage: ${adminView.marginPercentage}%`);

  if (adminView.marginAmount === undefined || adminView.marginPercentage === undefined) {
    throw new Error("FAILED: Admin view missing internal gross margin calculation!");
  }

  // Salesman view (must NOT see cost price or margins)
  const salesView = await quotesService.getQuoteById(company.id, quote.id, "SALESMAN");
  const salesHasUnitCost = salesView.lines.some(l => l.unitCost !== undefined);
  console.log(`[PASS] Salesman View:`);
  console.log(`   - Lines have unitCost exposed: ${salesHasUnitCost} (Expected: false)`);
  console.log(`   - marginAmount exposed: ${salesView.marginAmount !== undefined} (Expected: false)`);
  console.log(`   - marginPercentage exposed: ${salesView.marginPercentage !== undefined} (Expected: false)`);

  if (salesHasUnitCost || salesView.marginAmount !== undefined || salesView.marginPercentage !== undefined) {
    throw new Error("FAILED: Cost price or margin is leaking to Salesman!");
  }

  // Customer view (must NOT see cost price or margins)
  const customerView = await quotesService.getQuoteByShareToken(approvedQuote.shareToken);
  const customerHasUnitCost = customerView.lines.some(l => l.unitCost !== undefined);
  console.log(`[PASS] Customer View:`);
  console.log(`   - Lines have unitCost exposed: ${customerHasUnitCost} (Expected: false)`);
  console.log(`   - marginAmount exposed: ${customerView.marginAmount !== undefined} (Expected: false)`);
  console.log(`   - marginPercentage exposed: ${customerView.marginPercentage !== undefined} (Expected: false)`);

  if (customerHasUnitCost || customerView.marginAmount !== undefined || customerView.marginPercentage !== undefined) {
    throw new Error("FAILED: Cost price or margin is leaking to Customer!");
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 8: Server-Side PDF Proposal Generation
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 8: Server-Side PDF Proposal Generation ---");
  const pdfBuffer = await quotesService.getQuotePdfBuffer(company.id, quote.id);
  console.log(`[PASS] PDF Buffer generated successfully: ${pdfBuffer.length} bytes`);
  const pdfHeader = pdfBuffer.slice(0, 5).toString();
  console.log(`   - Binary Header: "${pdfHeader}" (Expected: "%PDF-")`);

  if (!pdfHeader.startsWith("%PDF-") || pdfBuffer.length < 1000) {
    throw new Error("FAILED: PDF generation output is invalid or empty!");
  }

  console.log("\n================================================================================");
  console.log("   ALL 8 QUOTATION MANAGEMENT MODULE CHECKS PASSED WITH 100% SUCCESS!");
  console.log("================================================================================\n");
}

runQuotationModuleAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ AUDIT ERROR:", err);
    process.exit(1);
  });
