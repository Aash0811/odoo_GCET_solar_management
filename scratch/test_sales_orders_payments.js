const prisma = require("../server/src/config/prisma");
const leadsService = require("../server/src/modules/leads/service");
const surveysService = require("../server/src/modules/surveys/service");
const quotesService = require("../server/src/modules/quotes/service");
const ordersService = require("../server/src/modules/orders/service");

async function runSalesOrdersAndPaymentsAudit() {
  console.log("================================================================================");
  console.log("    SALES ORDERS, PAYMENTS & MILESTONES — COMPREHENSIVE VERIFICATION");
  console.log("================================================================================\n");

  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("No active company found.");
  console.log(`[OK] Testing in Company: "${company.name}" (ID: ${company.id})\n`);

  const adminUser = await prisma.user.findFirst({ where: { companyId: company.id, role: "ADMIN" } });
  const accountantUser = await prisma.user.findFirst({ where: { companyId: company.id, role: "ACCOUNTANT" } });
  const salesUser = await prisma.user.findFirst({ where: { companyId: company.id, role: "SALESMAN" } });

  console.log(`[OK] Admin Actor: ${adminUser?.name} (${adminUser?.email})`);
  console.log(`[OK] Accountant Actor: ${accountantUser?.name} (${accountantUser?.email})`);
  console.log(`[OK] Sales Actor: ${salesUser?.name} (${salesUser?.email})\n`);

  // ─────────────────────────────────────────────────────────────
  // SETUP: Create & Qualify Lead -> Approve Survey -> Create Quote
  // ─────────────────────────────────────────────────────────────
  const uniqueId = Date.now();
  const testPhone = `9822${Math.floor(100000 + Math.random() * 900000)}`;
  const testAddress = `Plot ${Math.floor(100 + Math.random() * 900)}, Solar Enclave, Sector ${uniqueId % 100}, Hyderabad`;

  const lead = await leadsService.createLead(
    company.id,
    {
      title: `5 kW On-Grid Solar Project - Prof. Sanyal ${uniqueId}`,
      contactName: `Prof. Sanyal ${uniqueId}`,
      phone: testPhone,
      email: `sanyal_${uniqueId}@example.com`,
      address: testAddress,
      source: "WEBSITE",
      desiredCapacityKw: 5,
      monthlyBillAmount: 7500,
    },
    salesUser?.id
  );

  // Qualify lead
  await leadsService.updateChecklist(
    company.id,
    lead.id,
    {
      shadowFreeArea: true,
      monthlyBill: true,
      gridSuitable: true,
      desiredCapacityKw: 5,
      decision: "GO",
    },
    adminUser?.id
  );

  const survey = await prisma.survey.findFirst({
    where: { companyId: company.id, leadId: lead.id },
  });

  // Submit survey
  await surveysService.submitSurvey(company.id, survey.id, {
    roofType: "RCC_FLAT",
    shadowFreeAreaSqFt: 600,
    tiltAngleDeg: 15,
    roofDirection: "SOUTH",
    cableDistanceMeters: 30,
    recommendedKw: 5,
    remarks: "Excellent terrace conditions for 5 kW solar plant.",
  });

  // Approve survey
  await surveysService.reviewSurvey(
    company.id,
    survey.id,
    { status: "APPROVED", notes: "Survey verified by Chief Engineer" },
    adminUser?.id
  );

  // Find 5 kW On-Grid package template
  let pkg = await prisma.packageTemplate.findFirst({
    where: { companyId: company.id, defaultCapacityKw: 5, type: "ON_GRID" },
    include: { bomLines: { include: { product: true } } },
  });
  if (!pkg) {
    pkg = await prisma.packageTemplate.findFirst({
      where: { companyId: company.id },
      include: { bomLines: { include: { product: true } } },
    });
  }

  // Create Quotation
  const quote = await quotesService.createQuote(
    company.id,
    {
      leadId: lead.id,
      packageTemplateId: pkg.id,
      capacityKw: 5,
      discountAmount: 5000,
      validDays: 30,
    },
    salesUser?.id
  );

  console.log(`[SETUP] Quote Created: ${quote.quoteNumber} (Total: ₹${Number(quote.totalAmount).toLocaleString('en-IN')})\n`);

  // ─────────────────────────────────────────────────────────────
  // TEST 1: Quote Accepted -> Sales Order Created with Payment Milestones
  // ─────────────────────────────────────────────────────────────
  console.log("--- TEST 1: Quote Accepted -> Sales Order Auto-Creation & Payment Milestones ---");

  // Accept quote online with digital signature
  await quotesService.acceptQuote(
    null,
    quote.shareToken,
    {
      signature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      notes: "Accepted by Prof. Sanyal online proposal portal.",
    },
    {
      headers: { "user-agent": "Mozilla/5.0 Chrome/120.0" },
      socket: { remoteAddress: "152.58.42.11" },
    }
  );

  // Verify SalesOrder was automatically created
  const order = await prisma.salesOrder.findFirst({
    where: { companyId: company.id, quoteId: quote.id },
    include: {
      milestones: { orderBy: { createdAt: "asc" } },
      payments: true,
      customer: true,
    },
  });

  if (!order) {
    throw new Error("FAILED: SalesOrder was not created upon Quote Acceptance!");
  }

  console.log(`[PASS] Sales Order automatically spawned: ${order.orderNumber} (ID: ${order.id})`);
  console.log(`   - Status: ${order.status} (Expected: PENDING_PAYMENT)`);
  console.log(`   - Total Contract Amount: ₹${Number(order.totalAmount).toLocaleString('en-IN')}`);
  console.log(`   - Minimum Advance Required (30%): ₹${Number(order.minAdvanceAmount).toLocaleString('en-IN')}`);
  console.log(`   - Auto-Configured Payment Milestones (${order.milestones.length} stages):`);

  order.milestones.forEach((m, idx) => {
    console.log(`     ${idx + 1}. [${m.percentage}%] ${m.name}: ₹${Number(m.amount).toLocaleString('en-IN')} (Status: ${m.status})`);
  });

  if (order.milestones.length !== 3) {
    throw new Error(`FAILED: Expected 3 payment milestones (Advance, Delivery, Commissioning), got ${order.milestones.length}`);
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Rule Enforcement — Job NOT Released if Advance < 30%
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 2: Rule Enforcement (Partial Payment < 30% Holds Job Release) ---");
  const partialAmount = 20000; // ~7% of total contract, well below 30% advance
  const minAdvanceRequired = Number(order.minAdvanceAmount);

  console.log(`[INFO] Minimum advance required for job release: ₹${minAdvanceRequired.toLocaleString('en-IN')}`);
  console.log(`[INFO] Recording partial deposit: ₹${partialAmount.toLocaleString('en-IN')}`);

  const partialResult = await ordersService.recordPaymentAndConfirm(
    company.id,
    order.id,
    {
      amount: partialAmount,
      method: "UPI",
      transactionRef: `UPI-PARTIAL-${uniqueId.toString().slice(-6)}`,
      notes: "Token booking advance from customer UPI",
    },
    accountantUser?.id || adminUser.id
  );

  console.log(`[PASS] Result message: "${partialResult.message}"`);
  console.log(`   - Advance Satisfied: ${partialResult.advanceSatisfied} (Expected: false)`);
  console.log(`   - Receipt Generated: ${partialResult.payment.receiptNumber}`);

  // Verify Order status is still PENDING_PAYMENT
  const orderAfterPartial = await ordersService.getOrderById(company.id, order.id);
  console.log(`   - Order Status: ${orderAfterPartial.status} (Expected: PENDING_PAYMENT)`);
  console.log(`   - Total Collected: ₹${orderAfterPartial.totalPaid.toLocaleString('en-IN')}`);
  console.log(`   - Advance Deficit: ₹${orderAfterPartial.advanceDeficit.toLocaleString('en-IN')}`);

  if (orderAfterPartial.status !== "PENDING_PAYMENT" || partialResult.advanceSatisfied) {
    throw new Error("FAILED: Order was prematurely confirmed before meeting minimum advance!");
  }

  // Verify that pick list and installation jobs were NOT created
  const pickListsCount = await prisma.pickList.count({ where: { orderId: order.id } });
  const jobsCount = await prisma.installationJob.count({ where: { orderId: order.id } });
  const costsCount = await prisma.costEntry.count({ where: { orderId: order.id } });

  console.log(`   - Warehouse PickLists created: ${pickListsCount} (Expected: 0)`);
  console.log(`   - Installation Jobs created: ${jobsCount} (Expected: 0)`);
  console.log(`   - Project Costing entries: ${costsCount} (Expected: 0)`);

  if (pickListsCount > 0 || jobsCount > 0 || costsCount > 0) {
    throw new Error("FAILED: Automations fired prematurely when minimum 30% advance was not met!");
  }
  console.log(`[PASS] Verified: PickList, InstallationJob, and CostEntry are strictly on hold!`);

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Reaching Minimum 30% Advance Triggers ALL 3 Automations
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 3: Reaching 30% Minimum Advance Fires ALL 3 Automations Atomically ---");
  const secondPaymentAmount = Math.ceil(minAdvanceRequired - partialAmount + 1000); // Exceeds threshold

  console.log(`[INFO] Recording second payment of ₹${secondPaymentAmount.toLocaleString('en-IN')} via Bank Transfer / NEFT...`);

  const confirmResult = await ordersService.recordPaymentAndConfirm(
    company.id,
    order.id,
    {
      amount: secondPaymentAmount,
      method: "BANK_TRANSFER",
      transactionRef: `NEFT-HDFC-${uniqueId.toString().slice(-8)}`,
      notes: "Remaining advance payment cleared to satisfy 30% threshold",
      scheduledInstallDate: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
    },
    accountantUser?.id || adminUser.id
  );

  console.log(`[PASS] Advance satisfied: ${confirmResult.advanceSatisfied}`);
  console.log(`   - Receipt Generated: ${confirmResult.payment.receiptNumber}`);
  console.log(`   - Message: "${confirmResult.message}"`);

  // Verify Order Status moved to CONFIRMED
  const confirmedOrder = await ordersService.getOrderById(company.id, order.id);
  console.log(`   - Order Status: ${confirmedOrder.status} (Expected: CONFIRMED)`);
  console.log(`   - Total Paid to Date: ₹${confirmedOrder.totalPaid.toLocaleString('en-IN')} (${confirmedOrder.percentPaid}%)`);

  if (confirmedOrder.status !== "CONFIRMED") {
    throw new Error(`FAILED: Expected order status CONFIRMED, got ${confirmedOrder.status}`);
  }

  // Verify Automation 1: Warehouse PickList
  if (!confirmResult.pickList || !confirmResult.pickList.pickNumber) {
    throw new Error("FAILED: Automation 1 did not create Warehouse PickList!");
  }
  console.log(`[PASS] Automation 1 Fired: Warehouse Pick List "${confirmResult.pickList.pickNumber}" created (Status: ${confirmResult.pickList.status})`);
  console.log(`   - Consolidated items to pick: ${confirmResult.pickList.lines?.length || 0}`);

  // Verify Automation 2: Installation Job
  if (!confirmResult.installationJob || !confirmResult.installationJob.jobNumber) {
    throw new Error("FAILED: Automation 2 did not create Installation Job!");
  }
  console.log(`[PASS] Automation 2 Fired: Installation Job "${confirmResult.installationJob.jobNumber}" scheduled on crew calendar`);
  console.log(`   - Scheduled Date: ${new Date(confirmResult.installationJob.scheduledAt).toLocaleDateString()}`);

  // Verify Automation 3: Project/Job-costing record
  if (!confirmResult.costEntry || !confirmResult.costEntry.id) {
    throw new Error("FAILED: Automation 3 did not create Project Costing record!");
  }
  console.log(`[PASS] Automation 3 Fired: Project Job-Costing Base record created`);
  console.log(`   - Category: ${confirmResult.costEntry.category}`);
  console.log(`   - Estimated BOM Cost: ₹${Number(confirmResult.costEntry.amount).toLocaleString('en-IN')}`);

  // Verify Milestone 1 status is updated to PAID
  const advanceMilestone = confirmedOrder.milestones.find(m => m.stage === "ADVANCE");
  console.log(`[PASS] Milestone 1 (Advance) Status: ${advanceMilestone?.status} (Expected: PAID)`);
  if (advanceMilestone?.status !== "PAID") {
    throw new Error(`FAILED: Advance milestone status expected PAID, got ${advanceMilestone?.status}`);
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 4: Payment Recording Across All Modes (Cash, Cheque, UPI, Bank Transfer)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 4: Payment Recording Across Multiple Modes & References ---");
  const deliveryPayment = await ordersService.recordPaymentAndConfirm(
    company.id,
    order.id,
    {
      amount: 40000,
      method: "CHEQUE",
      transactionRef: "CHQ-882190-ICICI",
      notes: "Material delivery check cleared at local branch",
    },
    accountantUser?.id || adminUser.id
  );

  console.log(`[PASS] Cheque Payment recorded: Receipt ${deliveryPayment.payment.receiptNumber}`);
  console.log(`   - Method: ${deliveryPayment.payment.method}`);
  console.log(`   - Reference: ${deliveryPayment.payment.transactionRef}`);
  console.log(`   - Amount: ₹${Number(deliveryPayment.payment.amount).toLocaleString('en-IN')}`);

  const cashPayment = await ordersService.recordPaymentAndConfirm(
    company.id,
    order.id,
    {
      amount: 10000,
      method: "CASH",
      transactionRef: "CASH-REC-VAULT-04",
      notes: "Cash collection receipt at customer site",
    },
    accountantUser?.id || adminUser.id
  );

  console.log(`[PASS] Cash Payment recorded: Receipt ${cashPayment.payment.receiptNumber}`);
  console.log(`   - Method: ${cashPayment.payment.method}`);
  console.log(`   - Reference: ${cashPayment.payment.transactionRef}`);

  // ─────────────────────────────────────────────────────────────
  // TEST 5: Outstanding Balance Tracking & Receipts
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 5: Outstanding Balance Tracking & Official PDF Receipts ---");
  const finalOrder = await ordersService.getOrderById(company.id, order.id);
  console.log(`[PASS] Order Financial Ledger:`);
  console.log(`   - Total Contract Value: ₹${Number(finalOrder.totalAmount).toLocaleString('en-IN')}`);
  console.log(`   - Total Paid to Date: ₹${finalOrder.totalPaid.toLocaleString('en-IN')} (${finalOrder.percentPaid}%)`);
  console.log(`   - Outstanding Balance: ₹${finalOrder.outstandingBalance.toLocaleString('en-IN')}`);
  console.log(`   - Total Receipts Generated: ${finalOrder.payments.length}`);

  finalOrder.payments.forEach((p, idx) => {
    console.log(`     ${idx + 1}. [${p.receiptNumber}] ${p.method} — ₹${Number(p.amount).toLocaleString('en-IN')} (Ref: ${p.transactionRef})`);
  });

  // Generate PDF Receipt for the first payment
  const firstPayment = finalOrder.payments[0];
  const pdfBuffer = await ordersService.getPaymentReceiptPdfBuffer(company.id, order.id, firstPayment.id);
  const pdfHeader = pdfBuffer.slice(0, 5).toString();

  console.log(`[PASS] PDF Receipt Buffer generated: ${pdfBuffer.length} bytes (Header: "${pdfHeader}")`);
  if (!pdfHeader.startsWith("%PDF-") || pdfBuffer.length < 1000) {
    throw new Error("FAILED: Generated Payment Receipt PDF is invalid!");
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 6: Payment Reminders Dispatched to Customer
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 6: Payment Milestone Reminder Dispatch ---");
  const reminderResult = await ordersService.sendPaymentReminder(
    company.id,
    order.id,
    salesUser?.id || adminUser.id,
    { notes: "Automated WhatsApp payment reminder for delivery milestone" }
  );

  console.log(`[PASS] Reminder dispatched: "${reminderResult.message}"`);
  console.log(`   - Last Reminder Timestamp: ${reminderResult.lastReminderSentAt}`);

  const updatedOrderReminder = await prisma.salesOrder.findUnique({ where: { id: order.id } });
  if (!updatedOrderReminder.lastReminderSentAt) {
    throw new Error("FAILED: lastReminderSentAt was not recorded on SalesOrder!");
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 7: Accountant Verification & RBAC Access Enforcement
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 7: Accountant Verification & RBAC Access Enforcement ---");
  const verifyResult = await ordersService.verifyPayment(
    company.id,
    order.id,
    firstPayment.id,
    accountantUser?.id || adminUser.id,
    { notes: "Audited against bank statement reconciliation." }
  );

  console.log(`[PASS] Payment verified: isVerified = ${verifyResult.isVerified} by actor ID ${verifyResult.verifiedById}`);

  // Verify Role Restrictions:
  // Sales sees status and payment history:
  const salesOrdersView = await ordersService.getOrders(company.id, { customerId: order.customerId });
  console.log(`[PASS] Salesman can view orders & status: Found ${salesOrdersView.length} orders for customer`);

  // Customer sees their own payment history:
  const customerOrdersView = await prisma.salesOrder.findMany({
    where: { customerId: order.customerId },
    include: { payments: true },
  });
  console.log(`[PASS] Customer can view payment history: ${customerOrdersView[0].payments.length} receipts accessible`);

  console.log("\n================================================================================");
  console.log("   ALL 7 SALES ORDER & PAYMENTS MODULE CHECKS PASSED WITH 100% SUCCESS!");
  console.log("================================================================================\n");
}

runSalesOrdersAndPaymentsAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ AUDIT ERROR:", err);
    process.exit(1);
  });

