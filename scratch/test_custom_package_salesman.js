require("dotenv").config({ path: require("path").resolve(__dirname, "../server/.env") });
const prisma = require("../server/src/config/prisma");
const inventoryService = require("../server/src/modules/inventory/service");
const quotesService = require("../server/src/modules/quotes/service");
const leadsService = require("../server/src/modules/leads/service");
const surveysService = require("../server/src/modules/surveys/service");

async function runTest() {
  console.log("======================================================================");
  console.log("   AUDIT: SALESMAN SOLAR PACKAGE CUSTOMIZATION ENGINE VERIFICATION   ");
  console.log("======================================================================\n");

  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("No active company found.");
  console.log(`[INIT] Verified company: ${company.name} (${company.id})`);

  // Find or create a salesman user
  let salesman = await prisma.user.findFirst({ where: { companyId: company.id, role: "SALESMAN", isActive: true } });
  if (!salesman) {
    salesman = await prisma.user.findFirst({ where: { companyId: company.id, isActive: true } });
  }
  console.log(`[USER] Testing with Salesman: ${salesman.name} (${salesman.email}, Role: ${salesman.role})`);

  // Fetch active products to customize package with
  const allProducts = await inventoryService.getProducts(company.id, {}, "SALESMAN");
  console.log(`[OK] Fetched ${allProducts.length} active inventory products for customization.`);

  const panels = allProducts.filter((p) => p.category === "PANEL");
  const inverters = allProducts.filter((p) => p.category === "INVERTER");
  const batteries = allProducts.filter((p) => p.category === "BATTERY");
  const cables = allProducts.filter((p) => p.category === "CABLE");

  if (!panels[0] || !inverters[0]) {
    throw new Error("Missing required panel or inverter master data.");
  }

  // ─────────────────────────────────────────────────────────────────
  // TEST 1: Salesman Customizes Solar Package Template
  // ─────────────────────────────────────────────────────────────────
  console.log("\n--- TEST 1: Salesman Creates Customized Solar Package ---");
  const customPackageData = {
    name: `Customized Monocrystalline 5kW - ${salesman.name}`,
    description: "Custom salesman package featuring Tier-1 Bifacial panels, hybrid inverter, and extended copper cable run.",
    type: "ON_GRID",
    minCapacityKw: 2,
    maxCapacityKw: 10,
    defaultCapacityKw: 5,
    basePrice: 285000,
    gstRate: 12,
    bomLines: [
      {
        productId: panels[0].id,
        quantityPerKw: 2,
        fixedQuantity: 0,
        notes: "Tier-1 540W Mono-PERC Bifacial Modules (2 per kW)",
      },
      {
        productId: inverters[0].id,
        quantityPerKw: 0,
        fixedQuantity: 1,
        notes: "Heavy-duty 5kW On-Grid String Inverter",
      },
      ...(cables[0]
        ? [
            {
              productId: cables[0].id,
              quantityPerKw: 10,
              fixedQuantity: 15,
              notes: "Custom solar 4 sq.mm DC Copper Cable",
            },
          ]
        : []),
      ...(batteries[0]
        ? [
            {
              productId: batteries[0].id,
              quantityPerKw: 0,
              fixedQuantity: 1,
              notes: "Optional Hybrid Lithium Backup Pack",
            },
          ]
        : []),
    ],
  };

  const createdPackage = await inventoryService.createPackageTemplate(
    company.id,
    customPackageData,
    salesman.id
  );

  console.log(`[PASS] Custom Solar Package created successfully! ID: ${createdPackage.id}`);
  console.log(`   - Name: ${createdPackage.name}`);
  console.log(`   - Default Capacity: ${createdPackage.defaultCapacityKw} kW`);
  console.log(`   - Base Price: ₹${Number(createdPackage.basePrice).toLocaleString()}`);
  console.log(`   - Customized BOM Components: ${createdPackage.bomLines.length} items`);
  createdPackage.bomLines.forEach((l, idx) => {
    console.log(`     ${idx + 1}. [${l.product?.category}] ${l.product?.name} (perKw: ${l.quantityPerKw}, fixed: ${l.fixedQuantity}) - Notes: "${l.notes}"`);
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 2: Verify Custom Package Appears in Templates Query
  // ─────────────────────────────────────────────────────────────────
  console.log("\n--- TEST 2: Query Custom Package Templates from Catalogue ---");
  const templates = await inventoryService.getPackageTemplates(company.id, "SALESMAN");
  const foundCustom = templates.find((t) => t.id === createdPackage.id);
  if (!foundCustom) {
    throw new Error("Custom package template not found in catalogue query.");
  }
  console.log(`[PASS] Custom package successfully listed in catalogue templates (Total: ${templates.length} templates)`);

  // ─────────────────────────────────────────────────────────────────
  // TEST 3: Salesman Creates Proposal Quote Using Custom Package
  // ─────────────────────────────────────────────────────────────────
  console.log("\n--- TEST 3: Salesman Generates Quote Using Custom Package ---");
  // Find or create survey-approved lead
  let approvedLead = await prisma.lead.findFirst({
    where: { companyId: company.id, stage: "SURVEY_APPROVED" },
  });

  if (!approvedLead) {
    // Create lead and survey approve it
    const newLead = await leadsService.createLead(company.id, {
      title: "5kW Residential - Rajesh Varma",
      contactName: "Rajesh Varma",
      phone: `9876${Math.floor(100000 + Math.random() * 900000)}`,
      email: "rajesh.varma@example.com",
      address: "Villa 42, Jubilee Hills, Hyderabad",
      desiredCapacityKw: 5,
    }, salesman.id);

    // Qualify the lead before scheduling survey
    await leadsService.updateChecklist(company.id, newLead.id, {
      shadowFreeArea: true,
      monthlyBill: true,
      gridSuitable: true,
      decision: "GO",
    }, salesman.id);

    const survey = await surveysService.scheduleSurvey(company.id, {
      leadId: newLead.id,
      scheduledAt: new Date(),
    }, salesman.id);

    await surveysService.reviewSurvey(company.id, survey.id, {
      status: "APPROVED",
      notes: "Survey verified and approved for custom 5kW installation.",
    }, salesman.id);

    approvedLead = await prisma.lead.findUnique({ where: { id: newLead.id } });
  }

  console.log(`[LEAD] Using survey-approved lead: ${approvedLead.contactName} (${approvedLead.id})`);

  // Explode BOM lines for 5kW
  const quoteLines = createdPackage.bomLines.map((l, i) => {
    const qty = Math.max(1, Math.ceil(Number(l.quantityPerKw) * 5 + Number(l.fixedQuantity)));
    const unitPrice = Number(l.product?.salePrice || 15000);
    return {
      productId: l.productId,
      description: `${l.product?.name} (${l.product?.sku}) - Custom Salesman Specification`,
      quantity: qty,
      unitPrice,
      unitCost: Number(l.product?.costPrice || 0),
      gstRate: Number(l.product?.gstRate || 18),
      lineTotal: qty * unitPrice,
      sortOrder: i,
    };
  });

  const quoteData = {
    leadId: approvedLead.id,
    packageTemplateId: createdPackage.id,
    capacityKw: 5,
    subsidyNote: "PM Surya Ghar ₹78,000 Central DBT Scheme Applied",
    subsidyAmount: 78000,
    discountAmount: 5000,
    validDays: 30,
    customLines: quoteLines,
  };

  const quote = await quotesService.createQuote(company.id, quoteData, salesman.id);
  console.log(`[PASS] Quote successfully generated using customized package! Quote #: ${quote.quoteNumber}`);
  console.log(`   - System Capacity: ${quote.capacityKw} kW`);
  console.log(`   - Total Subtotal: ₹${Number(quote.subtotal).toLocaleString()}`);
  console.log(`   - Discount Applied: ₹${Number(quote.discountAmount).toLocaleString()}`);
  console.log(`   - GST: ₹${Number(quote.gstAmount).toLocaleString()}`);
  console.log(`   - Total Quote Amount: ₹${Number(quote.totalAmount).toLocaleString()}`);
  console.log(`   - Line Items Exploded from Custom BOM: ${quote.lines.length}`);
  quote.lines.forEach((line, i) => {
    console.log(`     ${i + 1}. ${line.description} | Qty: ${line.quantity} @ ₹${Number(line.unitPrice).toLocaleString()} = ₹${Number(line.lineTotal).toLocaleString()}`);
  });

  console.log("\n======================================================================");
  console.log("   🎉 ALL 3 SOLAR PACKAGE CUSTOMIZER TESTS PASSED SUCCESSFULLY!   ");
  console.log("======================================================================\n");
}

runTest()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
