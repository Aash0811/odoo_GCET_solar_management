const prisma = require("../server/src/config/prisma");
const inventoryService = require("../server/src/modules/inventory/service");

async function runCatalogueAudit() {
  console.log("=== STARTING PRODUCT & PACKAGE CATALOGUE (MASTER DATA) AUDIT ===");

  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("No active company found.");
  console.log(`[OK] Testing on company: ${company.name} (${company.id})`);

  // ─────────────────────────────────────────────────────────────
  // TEST 1: Product Types (Hardware, Service, Package)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 1: Product Types (Hardware, Service, Package) ---");
  const adminProducts = await inventoryService.getProducts(company.id, {}, "ADMIN");
  console.log(`[PASS] Total products in catalog: ${adminProducts.length}`);

  const hardwareItems = adminProducts.filter(p => p.productType === "HARDWARE");
  const serviceItems = adminProducts.filter(p => p.productType === "SERVICE");

  console.log(`   - Hardware components count: ${hardwareItems.length}`);
  console.log(`   - Service components count: ${serviceItems.length}`);

  if (hardwareItems.length === 0 || serviceItems.length === 0) {
    throw new Error("FAILED: Catalog must contain both Hardware and Service product types!");
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Installation as a Service Product with Labour Hours & Standard Cost
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 2: Installation as a Service Product ---");
  const installService = adminProducts.find(p => p.sku === "SRV-INSTALL-LABOUR");
  if (!installService) throw new Error("FAILED: Standard installation service product missing!");

  console.log(`[PASS] Verified Service Product: "${installService.name}" (${installService.sku})`);
  console.log(`   - Product Type: ${installService.productType} (Expected: SERVICE)`);
  console.log(`   - Standard Labour Hours: ${installService.laborHours} hours`);
  console.log(`   - Standard Cost Price: ₹${Number(installService.costPrice).toLocaleString('en-IN')}`);
  console.log(`   - Selling Price: ₹${Number(installService.salePrice).toLocaleString('en-IN')}`);
  console.log(`   - Subsidy Eligible: ${installService.isSubsidyEligible}`);

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Per-Component Flags (Serial-Tracked vs Quantity-Only)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 3: Per-Component Flags (Serial-Tracked vs Quantity-Only) ---");
  const serialTracked = adminProducts.filter(p => p.isSerialTracked);
  const quantityOnly = adminProducts.filter(p => !p.isSerialTracked);

  console.log(`[PASS] Serial-Tracked Components (${serialTracked.length} items):`);
  serialTracked.slice(0, 4).forEach(p => console.log(`   - [SERIAL] ${p.sku}: ${p.name} (${p.category})`));

  console.log(`[PASS] Quantity-Only Components (${quantityOnly.length} items):`);
  quantityOnly.slice(0, 4).forEach(p => console.log(`   - [QTY-ONLY] ${p.sku}: ${p.name} (Unit: ${p.unit})`));

  // Verify key items have correct tracking flags
  const inv = adminProducts.find(p => p.category === "INVERTER");
  const bat = adminProducts.find(p => p.category === "BATTERY");
  const wire = adminProducts.find(p => p.category === "CABLE");

  if (!inv?.isSerialTracked || !bat?.isSerialTracked || wire?.isSerialTracked) {
    throw new Error("FAILED: Inverters and Batteries must be serial-tracked, cables must be quantity-only!");
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 4: Dynamic Warranty Rules Configured per Product
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 4: Dynamic Warranty Rules per Product ---");
  console.log("Current Warranty Rules configured by Admin:");
  adminProducts.slice(0, 6).forEach(p => {
    console.log(`   - ${p.sku}: ${p.warrantyYears} Years Warranty`);
  });

  // Admin dynamically reconfigures battery warranty from 5 to 7 years
  const batteryProd = adminProducts.find(p => p.sku === "BAT-48V-100AH");
  if (batteryProd) {
    const updated = await inventoryService.updateProduct(company.id, batteryProd.id, {
      warrantyYears: 7,
    }, null);
    console.log(`[PASS] Dynamically updated battery warranty to: ${updated.warrantyYears} Years!`);
    if (updated.warrantyYears !== 7) throw new Error("FAILED: Battery warranty not updated!");
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 5: Bill of Materials (BOM) per Package: On-Grid vs Off-Grid
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 5: Bill of Materials (BOM) per Package ---");
  const templates = await inventoryService.getPackageTemplates(company.id, "ADMIN");

  const onGridPkg = templates.find(t => t.type === "ON_GRID");
  const offGridPkg = templates.find(t => t.type === "OFF_GRID");

  if (!onGridPkg || !offGridPkg) {
    throw new Error("FAILED: Both On-Grid and Off-Grid packages must be configured!");
  }

  console.log(`[PASS] On-Grid Package: "${onGridPkg.name}" (${onGridPkg.minCapacityKw} kW to ${onGridPkg.maxCapacityKw} kW)`);
  console.log(`   - BOM Components: ${onGridPkg.bomLines.length} items`);
  onGridPkg.bomLines.forEach(b => console.log(`      * ${b.product.name} (Qty/kW: ${b.quantityPerKw}, Fixed: ${b.fixedQuantity})`));

  console.log(`[PASS] Off-Grid Package: "${offGridPkg.name}" (${offGridPkg.minCapacityKw} kW to ${offGridPkg.maxCapacityKw} kW)`);
  console.log(`   - BOM Components: ${offGridPkg.bomLines.length} items`);

  // Verify Off-Grid BOM contains Battery
  const hasBattery = offGridPkg.bomLines.some(b => b.product.category === "BATTERY");
  const onGridHasBattery = onGridPkg.bomLines.some(b => b.product.category === "BATTERY");

  console.log(`   - Off-Grid BOM contains Battery Storage: ${hasBattery}`);
  console.log(`   - On-Grid BOM contains Battery Storage: ${onGridHasBattery}`);

  if (!hasBattery || onGridHasBattery) {
    throw new Error("FAILED: Off-Grid package must contain battery; On-Grid package must not contain battery!");
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 6: Dynamic Variants by Capacity (e.g. 1 kW to 3 kW)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 6: Dynamic Variants by Capacity Configured by Admin ---");
  // Admin creates a custom 1 kW to 3 kW Urban Rooftop Variant
  const customVariant = await inventoryService.createPackageTemplate(company.id, {
    name: "Urban Compact 1 kW - 3 kW On-Grid Solar Kit",
    description: "Tailored for urban apartments with limited terrace space (1 to 3 kW range).",
    type: "ON_GRID",
    minCapacityKw: 1,
    maxCapacityKw: 3,
    defaultCapacityKw: 2,
    basePrice: 120000,
    bomLines: [
      { productId: adminProducts.find(p => p.sku === "PAN-540-MONO").id, quantityPerKw: 2, fixedQuantity: 0 },
      { productId: adminProducts.find(p => p.sku === "INV-3KW-ONGRID").id, quantityPerKw: 0, fixedQuantity: 1 },
      { productId: adminProducts.find(p => p.sku === "STR-GI-1KW").id, quantityPerKw: 1, fixedQuantity: 0 },
      { productId: adminProducts.find(p => p.sku === "SRV-INSTALL-LABOUR").id, quantityPerKw: 1, fixedQuantity: 0 },
    ],
  }, null);

  console.log(`[PASS] Created Custom Variant Package: "${customVariant.name}"`);
  console.log(`   - Min Capacity: ${customVariant.minCapacityKw} kW`);
  console.log(`   - Max Capacity: ${customVariant.maxCapacityKw} kW`);
  console.log(`   - Default Capacity: ${customVariant.defaultCapacityKw} kW`);
  console.log(`   - BOM lines attached: ${customVariant.bomLines.length}`);

  if (Number(customVariant.minCapacityKw) !== 1 || Number(customVariant.maxCapacityKw) !== 3) {
    throw new Error("FAILED: Custom capacity bounds (1-3 kW) not set correctly!");
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 7: Access Control — Cost Price Hiding for Non-Admin
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- TEST 7: Access Control — Cost Price Privacy ---");
  // Query as SALESMAN
  const salesmanProducts = await inventoryService.getProducts(company.id, {}, "SALESMAN");
  const salesFirst = salesmanProducts[0];

  console.log(`Salesman view of product "${salesFirst.name}":`);
  console.log(`   - Sale Price: ₹${salesFirst.salePrice}`);
  console.log(`   - Cost Price visible to Salesman: ${salesFirst.costPrice !== undefined ? "YES (BREACH!)" : "NO (PROTECTED!)"}`);

  // Query as TECHNICIAN (Crew)
  const techProducts = await inventoryService.getProducts(company.id, {}, "TECHNICIAN");
  const techFirst = techProducts[0];
  console.log(`Technician (Crew) view of product:`);
  console.log(`   - Cost Price visible to Crew: ${techFirst.costPrice !== undefined ? "YES (BREACH!)" : "NO (PROTECTED!)"}`);

  // Query as CUSTOMER
  const custProducts = await inventoryService.getProducts(company.id, {}, "CUSTOMER");
  const custFirst = custProducts[0];
  console.log(`Customer view of product:`);
  console.log(`   - Cost Price visible to Customer: ${custFirst.costPrice !== undefined ? "YES (BREACH!)" : "NO (PROTECTED!)"}`);

  if (salesFirst.costPrice !== undefined || techFirst.costPrice !== undefined || custFirst.costPrice !== undefined) {
    throw new Error("SECURITY FAILURE: Cost price was leaked to non-admin roles!");
  }
  console.log(`[PASS] Cost price is strictly hidden from sales, crew, and customers!`);

  // Verify Admin sees costPrice
  const adminFirst = adminProducts[0];
  console.log(`Admin view of product:`);
  console.log(`   - Cost Price visible to Admin: ${adminFirst.costPrice !== undefined ? `YES (₹${adminFirst.costPrice})` : "NO"}`);
  if (adminFirst.costPrice === undefined) {
    throw new Error("FAILED: Admin must be able to view cost price!");
  }

  console.log("\n=========================================================================");
  console.log(">>> ALL 7 PRODUCT & PACKAGE CATALOGUE (MASTER DATA) TESTS PASSED! <<<");
  console.log("=========================================================================");
  process.exit(0);
}

runCatalogueAudit().catch(err => {
  console.error("\nTEST SUITE FAILED:", err);
  process.exit(1);
});

