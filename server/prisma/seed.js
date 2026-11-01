const bcrypt = require("bcrypt");
const prisma = require("../src/config/prisma");

async function main() {
  console.log("==================================================================");
  console.log("  SunPower Solutions — Comprehensive Database Seeder Starting...   ");
  console.log("==================================================================");

  // 1. Clean existing data in reverse foreign-key dependency order
  console.log("Cleaning existing records in exact reverse dependency order...");
  await prisma.dashboardShareLink.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.signature.deleteMany();
  await prisma.jobPhoto.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.costEntry.deleteMany();
  await prisma.installationJob.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.ticketLine.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.warranty.deleteMany();
  await prisma.serialNumber.updateMany({ data: { replacesSerialId: null } });
  await prisma.serialNumber.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.paymentMilestone.deleteMany();
  await prisma.pickLine.deleteMany();
  await prisma.pickList.deleteMany();
  await prisma.stockTransferRequest.deleteMany();
  await prisma.stockMove.deleteMany();
  await prisma.warehouseStock.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.quotePhoto.deleteMany();
  await prisma.quoteLine.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.bomLine.deleteMany();
  await prisma.packageTemplate.deleteMany();
  await prisma.surveyPhoto.deleteMany();
  await prisma.survey.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.subsidyApplication.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  console.log("Cleaned existing records successfully.");

  // 2. Create Company
  const company = await prisma.company.create({
    data: {
      name: "SunPower Solutions Pvt Ltd",
      slug: "sunpower",
      email: "info@sunpowersolutions.com",
      phone: "+91 98765 00000",
      address: "Plot 42, Energy Park, Madhapur, Hyderabad, Telangana 500081",
      gstNumber: "36AABCS1234F1Z8",
      isActive: true,
    },
  });
  console.log(`Created Company: ${company.name}`);

  // 3. Create Users for all roles (Pass: password123 / SunPower@2024)
  const passwordHash = await bcrypt.hash("password123", 10);

  const users = await prisma.$transaction([
    prisma.user.create({
      data: {
        companyId: company.id,
        name: "Arjun Verma (Director)",
        email: "admin@sunpower.com",
        phone: "+91 98000 00001",
        passwordHash,
        role: "ADMIN",
      },
    }),
    prisma.user.create({
      data: {
        companyId: company.id,
        name: "Rahul Sharma (Sales Lead)",
        email: "sales@sunpower.com",
        phone: "+91 98000 00002",
        passwordHash,
        role: "SALESMAN",
      },
    }),
    prisma.user.create({
      data: {
        companyId: company.id,
        name: "Anil Mehta (Accountant)",
        email: "accountant@sunpower.com",
        phone: "+91 98000 00006",
        passwordHash,
        role: "ACCOUNTANT",
      },
    }),
    prisma.user.create({
      data: {
        companyId: company.id,
        name: "Kiran Patel (Warehouse Head)",
        email: "warehouse@sunpower.com",
        phone: "+91 98000 00003",
        passwordHash,
        role: "WAREHOUSE",
      },
    }),
    prisma.user.create({
      data: {
        companyId: company.id,
        name: "Vikram Singh (Senior Technician)",
        email: "tech@sunpower.com",
        phone: "+91 98000 00004",
        passwordHash,
        role: "TECHNICIAN",
      },
    }),
    prisma.user.create({
      data: {
        companyId: company.id,
        name: "Arjun Rao (Delivery Agent)",
        email: "delivery@sunpower.com",
        phone: "+91 98000 00007",
        passwordHash,
        role: "DELIVERY_AGENT",
      },
    }),
    prisma.user.create({
      data: {
        companyId: company.id,
        name: "Pooja Reddy (Service Desk)",
        email: "support@sunpower.com",
        phone: "+91 98000 00005",
        passwordHash,
        role: "SUPPORT",
      },
    }),
    prisma.user.create({
      data: {
        companyId: company.id,
        name: "Ravi Kumar (Customer)",
        email: "customer@sunpower.com",
        phone: "9000000001",
        passwordHash,
        role: "CUSTOMER",
      },
    }),
    prisma.user.create({
      data: {
        companyId: company.id,
        name: "Sita Devi (Customer)",
        email: "sita@sunpower.com",
        phone: "9000000002",
        passwordHash,
        role: "CUSTOMER",
      },
    }),
  ]);

  const [adminUser, salesUser, accountantUser, warehouseUser, techUser, deliveryUser, supportUser, customerUser, sitaUser] = users;
  console.log(`Created ${users.length} system users covering all 8 roles.`);

  // 4. Create 3 Solar Logistics Warehouses
  const whWest = await prisma.warehouse.create({
    data: {
      companyId: company.id,
      name: "Hyderabad West Solar Logistics Hub",
      code: "WH-HYD-WEST",
      city: "Hyderabad",
      zone: "Zone-1 West",
      address: "Plot 42, Hitec City Phase 2, Madhapur, Hyderabad, Telangana 500081",
      contactPerson: "Ramesh Sharma",
      phone: "+91 98490 11223",
      managerId: warehouseUser.id,
      isActive: true,
    },
  });

  const whEast = await prisma.warehouse.create({
    data: {
      companyId: company.id,
      name: "Hyderabad East Distribution Depot",
      code: "WH-HYD-EAST",
      city: "Hyderabad",
      zone: "Zone-2 East",
      address: "Shed 15, IDA Uppal, Hyderabad, Telangana 500039",
      contactPerson: "Kiran Varma",
      phone: "+91 98490 44556",
      isActive: true,
    },
  });

  const whSouth = await prisma.warehouse.create({
    data: {
      companyId: company.id,
      name: "Bengaluru South Regional Depot",
      code: "WH-BLR-SOUTH",
      city: "Bengaluru",
      zone: "Zone-South",
      address: "Industrial Area Phase 1, Electronic City, Bengaluru, Karnataka 560100",
      contactPerson: "Anand Rao",
      phone: "+91 99800 77889",
      isActive: true,
    },
  });
  console.log("Created 3 Regional Solar Logistics Warehouses.");

  // 5. Create 20 Hardware & Service Products
  const productsData = [
    // Panels
    { sku: "PAN-540-MONO", name: "Mono PERC 540W Tier-1 Solar PV Module", category: "PANEL", isSerialTracked: true, warrantyYears: 20, costPrice: 9500, salePrice: 13500, stockQty: 250 },
    { sku: "PAN-330-POLY", name: "Polycrystalline 330W Solar PV Module", category: "PANEL", isSerialTracked: true, warrantyYears: 20, costPrice: 5800, salePrice: 8200, stockQty: 110 },
    { sku: "PAN-550-BIFACIAL", name: "Bi-facial Dual Glass 550W Module", category: "PANEL", isSerialTracked: true, warrantyYears: 25, costPrice: 11000, salePrice: 15500, stockQty: 140 },
    // Inverters
    { sku: "INV-3KW-ONGRID", name: "3 kW Single-Phase On-Grid String Inverter", category: "INVERTER", isSerialTracked: true, warrantyYears: 5, costPrice: 24000, salePrice: 34000, stockQty: 35 },
    { sku: "INV-5KW-ONGRID", name: "5 kW Three-Phase On-Grid String Inverter", category: "INVERTER", isSerialTracked: true, warrantyYears: 5, costPrice: 38000, salePrice: 52000, stockQty: 28 },
    { sku: "INV-3KW-HYBRID", name: "3 kW Hybrid Bidirectional Inverter", category: "INVERTER", isSerialTracked: true, warrantyYears: 5, costPrice: 42000, salePrice: 58000, stockQty: 18 },
    { sku: "INV-5KW-OFFGRID", name: "5 kW Pure Sine Wave Off-Grid Inverter", category: "INVERTER", isSerialTracked: true, warrantyYears: 5, costPrice: 46000, salePrice: 64000, stockQty: 14 },
    // Batteries
    { sku: "BAT-48V-100AH", name: "Lithium Iron Phosphate (LiFePO4) 48V 100Ah", category: "BATTERY", isSerialTracked: true, warrantyYears: 5, costPrice: 62000, salePrice: 84000, stockQty: 25 },
    { sku: "BAT-12V-150AH", name: "Solar Tubular Lead Acid C10 12V 150Ah", category: "BATTERY", isSerialTracked: true, warrantyYears: 3, costPrice: 11500, salePrice: 16500, stockQty: 40 },
    // Structures
    { sku: "STR-GI-1KW", name: "Hot-Dip Galvanized Rooftop Structure (per kW)", category: "STRUCTURE", isSerialTracked: false, warrantyYears: 10, costPrice: 3200, salePrice: 4800, stockQty: 200 },
    { sku: "STR-ELEVATED-1KW", name: "Elevated High-Rise Rooftop Structure (per kW)", category: "STRUCTURE", isSerialTracked: false, warrantyYears: 10, costPrice: 5500, salePrice: 8500, stockQty: 80 },
    // Electrical & BOS
    { sku: "DCDB-1IN-1OUT", name: "DC Distribution Box 1000V with SPD & Fuse", category: "BOS", isSerialTracked: false, warrantyYears: 2, costPrice: 1800, salePrice: 2800, stockQty: 75 },
    { sku: "ACDB-1PH", name: "AC Distribution Box Single-Phase with MCB & SPD", category: "BOS", isSerialTracked: false, warrantyYears: 2, costPrice: 1600, salePrice: 2500, stockQty: 70 },
    { sku: "ACDB-3PH", name: "AC Distribution Box Three-Phase with Isolator", category: "BOS", isSerialTracked: false, warrantyYears: 2, costPrice: 2800, salePrice: 4200, stockQty: 50 },
    { sku: "CBL-DC-4SQMM", name: "Solar DC Copper Cable 4 sq mm (meter)", category: "CABLE", isSerialTracked: false, warrantyYears: 5, costPrice: 42, salePrice: 65, stockQty: 3500 },
    { sku: "CBL-AC-6SQMM", name: "Armoured AC Copper Cable 6 sq mm (meter)", category: "CABLE", isSerialTracked: false, warrantyYears: 5, costPrice: 75, salePrice: 115, stockQty: 2400 },
    { sku: "EARTH-ROD-2M", name: "Copper Bonded Chemical Earthing Electrode 2m", category: "EARTHING", isSerialTracked: false, warrantyYears: 5, costPrice: 1200, salePrice: 1950, stockQty: 150 },
    { sku: "EARTH-COMPOUND", name: "BFC Conductive Earth Enhancing Compound 25kg", category: "EARTHING", isSerialTracked: false, warrantyYears: 0, costPrice: 450, salePrice: 750, stockQty: 120 },
    { sku: "LIGHTNING-ARR", name: "Early Streamer Emission (ESE) Lightning Arrester", category: "SAFETY", isSerialTracked: false, warrantyYears: 3, costPrice: 4800, salePrice: 7500, stockQty: 45 },
    { sku: "SRV-INSTALL-LABOUR", name: "Standard Rooftop Installation & Commissioning Service", category: "SERVICE", isSerialTracked: false, warrantyYears: 1, costPrice: 4000, salePrice: 7000, stockQty: 999 },
  ];

  const products = [];
  for (const item of productsData) {
    const p = await prisma.product.create({
      data: {
        companyId: company.id,
        ...item,
      },
    });
    products.push(p);
  }
  console.log(`Created ${products.length} products with pricing, warranties, and stock tracking.`);

  // 6. Populate Warehouse Stocks across all 3 Warehouses
  for (const prod of products) {
    // West: 65% stock
    const westQty = Math.max(5, Math.floor(Number(prod.stockQty) * 0.65));
    await prisma.warehouseStock.create({
      data: { warehouseId: whWest.id, productId: prod.id, quantity: westQty, minQuantity: 10 },
    });

    // East: 25% stock (some items 0 to test pick restrictions)
    const isEastOutOfStock = prod.category === "BATTERY" || prod.sku.includes("BIFACIAL");
    const eastQty = isEastOutOfStock ? 0 : Math.max(2, Math.floor(Number(prod.stockQty) * 0.25));
    await prisma.warehouseStock.create({
      data: { warehouseId: whEast.id, productId: prod.id, quantity: eastQty, minQuantity: 5 },
    });

    // South: 10% stock
    const southQty = Math.max(1, Math.floor(Number(prod.stockQty) * 0.10));
    await prisma.warehouseStock.create({
      data: { warehouseId: whSouth.id, productId: prod.id, quantity: southQty, minQuantity: 3 },
    });
  }
  console.log("Populated WarehouseStock across all 3 regional facilities.");

  // Stock Transfer Requests
  const monoPanel = products.find((p) => p.sku === "PAN-540-MONO");
  const onGrid3kw = products.find((p) => p.sku === "INV-3KW-ONGRID");
  const onGrid5kw = products.find((p) => p.sku === "INV-5KW-ONGRID");
  const hybrid3kw = products.find((p) => p.sku === "INV-3KW-HYBRID");
  const litBattery = products.find((p) => p.sku === "BAT-48V-100AH");
  const structure = products.find((p) => p.sku === "STR-GI-1KW");
  const dcdb = products.find((p) => p.sku === "DCDB-1IN-1OUT");
  const acdb = products.find((p) => p.sku === "ACDB-1PH");
  const dcCable = products.find((p) => p.sku === "CBL-DC-4SQMM");
  const earthRod = products.find((p) => p.sku === "EARTH-ROD-2M");
  const installLabour = products.find((p) => p.sku === "SRV-INSTALL-LABOUR");

  await prisma.stockTransferRequest.create({
    data: {
      companyId: company.id,
      transferNumber: "TR-2026-001",
      fromWarehouseId: whWest.id,
      toWarehouseId: whEast.id,
      productId: monoPanel.id,
      quantity: 12,
      status: "IN_TRANSIT",
      requestedById: warehouseUser.id,
      approvedById: adminUser.id,
      notes: "Replenishing Hyderabad East depot for scheduled Villa installation.",
    },
  });

  await prisma.stockTransferRequest.create({
    data: {
      companyId: company.id,
      transferNumber: "TR-2026-002",
      fromWarehouseId: whWest.id,
      toWarehouseId: whSouth.id,
      productId: onGrid5kw.id,
      quantity: 3,
      status: "COMPLETED",
      requestedById: warehouseUser.id,
      approvedById: adminUser.id,
      completedAt: new Date(Date.now() - 3 * 86400000),
      notes: "Transferred 5kW inverters to Bengaluru depot.",
    },
  });

  // 7. Create 3 Package Templates with scaled BOM Lines
  const template3kwOnGrid = await prisma.packageTemplate.create({
    data: {
      companyId: company.id,
      name: "Residential 3 kW On-Grid Solar Package",
      description: "High-yield rooftop solar for homes with grid connectivity & net-metering support.",
      type: "ON_GRID",
      minCapacityKw: 1,
      maxCapacityKw: 5,
      defaultCapacityKw: 3,
      basePrice: 195000,
      bomLines: {
        create: [
          { productId: monoPanel.id, quantityPerKw: 2, fixedQuantity: 0, notes: "2 panels (540W) per kW" },
          { productId: onGrid3kw.id, quantityPerKw: 0, fixedQuantity: 1, notes: "Single 3kW central inverter" },
          { productId: structure.id, quantityPerKw: 1, fixedQuantity: 0, notes: "1 kW mounting structure set per kW" },
          { productId: dcdb.id, quantityPerKw: 0, fixedQuantity: 1, notes: "DC protection box" },
          { productId: acdb.id, quantityPerKw: 0, fixedQuantity: 1, notes: "AC protection box" },
          { productId: dcCable.id, quantityPerKw: 10, fixedQuantity: 10, notes: "10m per kW + 10m fixed" },
          { productId: earthRod.id, quantityPerKw: 0, fixedQuantity: 2, notes: "2 dedicated grounding electrodes" },
          { productId: installLabour.id, quantityPerKw: 1, fixedQuantity: 0, notes: "Installation charges scaled by kW" },
        ],
      },
    },
  });

  const template3kwOffGrid = await prisma.packageTemplate.create({
    data: {
      companyId: company.id,
      name: "Resilient 3 kW Off-Grid Battery Backup Package",
      description: "Energy independence with LiFePO4 battery storage for zero power cuts.",
      type: "OFF_GRID",
      minCapacityKw: 1,
      maxCapacityKw: 5,
      defaultCapacityKw: 3,
      basePrice: 320000,
      bomLines: {
        create: [
          { productId: monoPanel.id, quantityPerKw: 2, fixedQuantity: 0 },
          { productId: hybrid3kw.id, quantityPerKw: 0, fixedQuantity: 1 },
          { productId: litBattery.id, quantityPerKw: 0, fixedQuantity: 2, notes: "2x 48V 100Ah Lithium packs" },
          { productId: structure.id, quantityPerKw: 1, fixedQuantity: 0 },
          { productId: dcdb.id, quantityPerKw: 0, fixedQuantity: 1 },
          { productId: acdb.id, quantityPerKw: 0, fixedQuantity: 1 },
          { productId: dcCable.id, quantityPerKw: 12, fixedQuantity: 10 },
          { productId: earthRod.id, quantityPerKw: 0, fixedQuantity: 2 },
          { productId: installLabour.id, quantityPerKw: 1, fixedQuantity: 0 },
        ],
      },
    },
  });

  const template5kwOnGrid = await prisma.packageTemplate.create({
    data: {
      companyId: company.id,
      name: "Commercial & Villa 5 kW On-Grid Solar Package",
      description: "Heavy duty 3-phase solution for spacious villas and commercial units.",
      type: "ON_GRID",
      minCapacityKw: 3,
      maxCapacityKw: 10,
      defaultCapacityKw: 5,
      basePrice: 310000,
      bomLines: {
        create: [
          { productId: monoPanel.id, quantityPerKw: 2, fixedQuantity: 0 },
          { productId: onGrid5kw.id, quantityPerKw: 0, fixedQuantity: 1 },
          { productId: structure.id, quantityPerKw: 1, fixedQuantity: 0 },
          { productId: dcdb.id, quantityPerKw: 0, fixedQuantity: 1 },
          { productId: acdb.id, quantityPerKw: 0, fixedQuantity: 1 },
          { productId: dcCable.id, quantityPerKw: 10, fixedQuantity: 15 },
          { productId: earthRod.id, quantityPerKw: 0, fixedQuantity: 3 },
          { productId: installLabour.id, quantityPerKw: 1, fixedQuantity: 0 },
        ],
      },
    },
  });
  console.log("Created 3 Package Templates with scaled BOM Lines.");

  // 8. Create 8 Realistic Customers
  const customer1 = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: "Ravi Kumar",
      email: "customer@sunpower.com",
      phone: "9000000001",
      address: "Plot 12, Road No. 36, Madhapur, Hyderabad",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500081",
      latitude: 17.4485,
      longitude: 78.3750,
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: "Sita Devi",
      email: "sita@sunpower.com",
      phone: "9000000002",
      address: "Flat 402, Srinivasa Heights, KPHB Phase 3, Kukatpally, Hyderabad",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500072",
      latitude: 17.4933,
      longitude: 78.3995,
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: "Venkat Raman",
      email: "venkat.r@example.com",
      phone: "9845012345",
      address: "Villa 8, Green Meadows, Financial District, Gachibowli, Hyderabad",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500032",
      latitude: 17.4172,
      longitude: 78.3444,
    },
  });

  const customer4 = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: "Rajesh Sharma",
      email: "rajesh.sharma@example.com",
      phone: "9876543201",
      address: "Road No. 10, Banjara Hills, Hyderabad",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500034",
      latitude: 17.4156,
      longitude: 78.4357,
    },
  });

  const customer5 = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: "Priya Patel",
      email: "priya.patel@example.com",
      phone: "9876543202",
      address: "Plot 88, West Marredpally, Secunderabad",
      city: "Secunderabad",
      state: "Telangana",
      postalCode: "500026",
      latitude: 17.4520,
      longitude: 78.5080,
    },
  });

  const customer6 = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: "Ananya Rao",
      email: "ananya.rao@example.com",
      phone: "9876543203",
      address: "Plot 304, Jubilee Hills, Hyderabad",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500033",
      latitude: 17.4319,
      longitude: 78.4073,
    },
  });

  const customer7 = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: "Suresh Reddy",
      email: "suresh.reddy@example.com",
      phone: "9876543204",
      address: "Farmhouse 4, Kazipet Bypass, Warangal",
      city: "Warangal",
      state: "Telangana",
      postalCode: "506003",
      latitude: 17.9689,
      longitude: 79.5941,
    },
  });

  const customer8 = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: "Vikram Chandra",
      email: "vikram.chandra@example.com",
      phone: "9876543205",
      address: "Tower 2B, My Home Bhooja, Silpa Gram Craft Village, Hyderabad",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500081",
      latitude: 17.4431,
      longitude: 78.3820,
    },
  });
  console.log("Created 8 realistic customer accounts with addresses & coordinates.");

  // 9. Create 12 Leads cleanly distributed across all Kanban stages
  const leadsData = [
    { title: "3kW Rooftop Enquiry - Kondapur", contactName: "Amit Joshi", phone: "9811100001", email: "amit.joshi@example.com", address: "Kondapur, Hyderabad", stage: "NEW", shadowFreeArea: false, monthlyBill: false, gridSuitable: false, desiredCapacityKw: 3 },
    { title: "4kW Flat Roof Inquiry - Miyapur", contactName: "Manish Sharma", phone: "9811100002", email: "manish.s@example.com", address: "Miyapur, Hyderabad", stage: "NEW", shadowFreeArea: false, monthlyBill: false, gridSuitable: false, desiredCapacityKw: 4 },
    { title: "5kW Villa Solar Setup - Manikonda", contactName: "Praveen Rao", phone: "9811100003", email: "praveen.rao@example.com", address: "Manikonda, Hyderabad", stage: "CONTACTED", shadowFreeArea: true, monthlyBill: false, gridSuitable: false, lastContactAt: new Date(), desiredCapacityKw: 5 },
    { title: "Old Inactive Lead (Archived)", contactName: "Harish Pillai", phone: "9811100004", email: "harish.p@example.com", address: "Old City, Hyderabad", stage: "CONTACTED", archivedAt: new Date(Date.now() - 30 * 86400000), notes: "Customer shifted out of state" },
    { title: "4kW Qualified Residential - Madhapur", contactName: "Sneha Kapoor", phone: "9811100005", email: "sneha.k@example.com", address: "Madhapur, Hyderabad", stage: "QUALIFIED", shadowFreeArea: true, monthlyBill: true, gridSuitable: true, monthlyBillAmount: 4800, desiredCapacityKw: 4 },
    { title: "3kW Pre-qualified Terrace - Tellapur", contactName: "K. Balaji", phone: "9811100006", email: "k.balaji@example.com", address: "Tellapur, Hyderabad", stage: "QUALIFIED", shadowFreeArea: true, monthlyBill: true, gridSuitable: true, monthlyBillAmount: 3600, desiredCapacityKw: 3 },
    { title: "Site Survey Booked - Nizampet", contactName: "Deepak Nair", phone: "9811100007", email: "deepak.n@example.com", address: "Nizampet, Hyderabad", stage: "SURVEY_SCHEDULED", shadowFreeArea: true, monthlyBill: true, gridSuitable: true, monthlyBillAmount: 3500, desiredCapacityKw: 3 },
    { title: "Survey Measurements Completed - Attapur", contactName: "Meera Sen", phone: "9811100008", email: "meera.sen@example.com", address: "Attapur, Hyderabad", stage: "SURVEY_DONE", shadowFreeArea: true, monthlyBill: true, gridSuitable: true, monthlyBillAmount: 6200, desiredCapacityKw: 5 },
    { title: "Survey Approved - Ready for Quotation", contactName: "Rajesh Guha", phone: "9811100009", email: "rajesh.guha@example.com", address: "Begumpet, Hyderabad", stage: "SURVEY_APPROVED", shadowFreeArea: true, monthlyBill: true, gridSuitable: true, monthlyBillAmount: 4000, desiredCapacityKw: 3, customerId: customer1.id },
    { title: "Quotation Sent - PM Surya Ghar Subsidy", contactName: "Sunita Roy", phone: "9811100010", email: "sunita.roy@example.com", address: "Kukatpally, Hyderabad", stage: "QUOTED", shadowFreeArea: true, monthlyBill: true, gridSuitable: true, monthlyBillAmount: 5500, desiredCapacityKw: 4, customerId: customer2.id },
    { title: "Confirmed Rooftop Solar Contract", contactName: "Karthik Iyer", phone: "9811100011", email: "karthik.i@example.com", address: "Gachibowli, Hyderabad", stage: "WON", shadowFreeArea: true, monthlyBill: true, gridSuitable: true, monthlyBillAmount: 12000, desiredCapacityKw: 10, customerId: customer3.id },
    { title: "Budget Mismatch / Opted Local Vendor", contactName: "Gopal Krishna", phone: "9811100012", email: "gopal.k@example.com", address: "Chandanagar, Hyderabad", stage: "LOST", lossReason: "Customer opted for non-certified local vendor offering 45% discount", shadowFreeArea: false, monthlyBill: true, gridSuitable: true },
  ];

  const leads = [];
  for (const l of leadsData) {
    const lead = await prisma.lead.create({
      data: {
        companyId: company.id,
        assignedToId: salesUser.id,
        ...l,
      },
    });
    leads.push(lead);
  }
  console.log(`Created ${leads.length} Leads cleanly distributed across all Kanban stages.`);

  // 10. Create Site Surveys with Measurements, Angles, and Photos
  // A. Scheduled Survey (Deepak Nair)
  await prisma.survey.create({
    data: {
      companyId: company.id,
      leadId: leads[6].id,
      status: "SCHEDULED",
      scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
      surveyedById: techUser.id,
      roofType: "RCC Flat Concrete Terrace",
      roofAreaSqFt: 600,
      shadowFreeArea: true,
      monthlyBill: true,
      gridSuitable: true,
      recommendedKw: 3,
      notes: "Customer available between 10am-1pm. Inverter space confirmed on staircase head-room wall.",
    },
  });

  // B. In-Progress Survey (Meera Sen)
  await prisma.survey.create({
    data: {
      companyId: company.id,
      leadId: leads[7].id,
      status: "IN_PROGRESS",
      scheduledAt: new Date(),
      surveyedById: techUser.id,
      roofType: "RCC Flat Concrete Terrace",
      roofAreaSqFt: 780,
      shadowFreeArea: true,
      monthlyBill: true,
      gridSuitable: true,
      recommendedKw: 5,
      notes: "Measuring parapet shading clearance. South azimuth is optimal at 180 degrees.",
    },
  });

  // C. Approved Survey (Rajesh Guha)
  const approvedSurvey = await prisma.survey.create({
    data: {
      companyId: company.id,
      leadId: leads[8].id,
      status: "APPROVED",
      scheduledAt: new Date(Date.now() - 2 * 86400000),
      completedAt: new Date(Date.now() - 2 * 86400000 + 3600000),
      approvedAt: new Date(Date.now() - 86400000),
      surveyedById: techUser.id,
      roofType: "RCC Flat Concrete Terrace",
      roofAreaSqFt: 850,
      shadowFreeArea: true,
      monthlyBill: true,
      gridSuitable: true,
      recommendedKw: 3.3,
      notes: "Rooftop structure approved for 6x 540W Mono-PERC modules. Cable run: 18m to meter box.",
      photos: {
        create: [
          { url: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80", caption: "Clear South-facing rooftop layout" },
          { url: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&auto=format&fit=crop&q=80", caption: "Existing DISCOM LT 3-Phase Meter Board" },
        ],
      },
    },
  });

  // D. Approved Survey for Won Lead (Karthik Iyer)
  await prisma.survey.create({
    data: {
      companyId: company.id,
      leadId: leads[10].id,
      status: "APPROVED",
      scheduledAt: new Date(Date.now() - 10 * 86400000),
      completedAt: new Date(Date.now() - 9 * 86400000),
      approvedAt: new Date(Date.now() - 8 * 86400000),
      surveyedById: techUser.id,
      roofType: "Industrial Shed Metal Sheet",
      roofAreaSqFt: 2200,
      shadowFreeArea: true,
      monthlyBill: true,
      gridSuitable: true,
      recommendedKw: 10,
      notes: "Heavy-duty standing seam clamps required. LT service line capacity tested.",
    },
  });
  console.log("Created Site Surveys in SCHEDULED, IN_PROGRESS, and APPROVED stages with photos.");

  // 11. Create Quotes in various statuses
  // Active Quoted Lead Quote (Sunita Roy)
  await prisma.quote.create({
    data: {
      companyId: company.id,
      customerId: customer2.id,
      leadId: leads[9].id,
      packageTemplateId: template3kwOnGrid.id,
      createdById: salesUser.id,
      quoteNumber: "Q-2026-006",
      status: "SENT",
      capacityKw: 3,
      subtotal: 195000,
      gstRate: 18,
      gstAmount: 35100,
      totalAmount: 230100,
      subsidyAmount: 78000,
      netPayable: 152100,
      subsidyNote: "PM Surya Ghar Muft Bijli Yojana subsidy eligible for INR 78,000 direct DBT.",
      shareToken: "token-sunita-3kw",
      sentAt: new Date(Date.now() - 86400000),
      validUntil: new Date(Date.now() + 29 * 86400000),
      lines: {
        create: [
          { productId: monoPanel.id, description: "Mono PERC 540W Tier-1 Solar PV Modules", quantity: 6, unitPrice: 13500, unitCost: 9500, lineTotal: 81000 },
          { productId: onGrid3kw.id, description: "3 kW Single-Phase On-Grid String Inverter", quantity: 1, unitPrice: 34000, unitCost: 24000, lineTotal: 34000 },
          { productId: structure.id, description: "Hot-Dip Galvanized Rooftop Structure", quantity: 3, unitPrice: 4800, unitCost: 3200, lineTotal: 14400 },
          { productId: installLabour.id, description: "Installation, Commissioning & Net Metering Liaison", quantity: 3, unitPrice: 7000, unitCost: 4000, lineTotal: 21000 },
        ],
      },
    },
  });

  // Draft Quote (Manish Sharma)
  await prisma.quote.create({
    data: {
      companyId: company.id,
      customerId: customer4.id,
      leadId: leads[1].id,
      packageTemplateId: template5kwOnGrid.id,
      createdById: salesUser.id,
      quoteNumber: "Q-2026-007",
      status: "DRAFT",
      capacityKw: 5,
      subtotal: 310000,
      gstRate: 18,
      gstAmount: 55800,
      totalAmount: 365800,
      subsidyAmount: 78000,
      netPayable: 287800,
      lines: {
        create: [
          { productId: monoPanel.id, description: "Mono PERC 540W Tier-1 Modules", quantity: 10, unitPrice: 13500, unitCost: 9500, lineTotal: 135000 },
          { productId: onGrid5kw.id, description: "5 kW Three-Phase On-Grid Inverter", quantity: 1, unitPrice: 52000, unitCost: 38000, lineTotal: 52000 },
        ],
      },
    },
  });

  // 12. Create Sales Orders across all lifecycle stages
  console.log("Generating 5 diverse Sales Orders spanning COMPLETED, IN_PROGRESS, DISPATCHED, and CONFIRMED...");

  // Array of 4 Standard Orders + 1 Loss Order
  const ordersConfig = [
    {
      index: 1,
      orderNum: "SO-2026-001",
      quoteNum: "Q-2026-001",
      jobNum: "JOB-2026-001",
      delNum: "DEL-2026-001",
      pickNum: "PK-2026-001",
      customer: customer1,
      lead: leads[8],
      capacityKw: 3,
      template: template3kwOnGrid,
      status: "COMPLETED",
      orderDate: new Date(Date.now() - 800 * 86400000), // ~2.2 yrs ago (expired inverter warranty test scenario)
      isExpired: true,
      jobStatus: "COMPLETED",
      deliveryStatus: "DELIVERED",
    },
    {
      index: 2,
      orderNum: "SO-2026-002",
      quoteNum: "Q-2026-002",
      jobNum: "JOB-2026-002",
      delNum: "DEL-2026-002",
      pickNum: "PK-2026-002",
      customer: customer1,
      lead: leads[8],
      capacityKw: 3,
      template: template3kwOnGrid,
      status: "COMPLETED",
      orderDate: new Date(Date.now() - 15 * 86400000), // 15 days ago (active warranty, full connections verified, photos, signature)
      isExpired: false,
      jobStatus: "COMPLETED",
      deliveryStatus: "DELIVERED",
    },
    {
      index: 3,
      orderNum: "SO-2026-003",
      quoteNum: "Q-2026-003",
      jobNum: "JOB-2026-003",
      delNum: "DEL-2026-003",
      pickNum: "PK-2026-003",
      customer: customer2,
      lead: leads[9],
      capacityKw: 3,
      template: template3kwOnGrid,
      status: "INSTALLATION_IN_PROGRESS",
      orderDate: new Date(Date.now() - 5 * 86400000),
      isExpired: false,
      jobStatus: "IN_PROGRESS",
      deliveryStatus: "DELIVERED",
    },
    {
      index: 4,
      orderNum: "SO-2026-004",
      quoteNum: "Q-2026-004",
      jobNum: "JOB-2026-004",
      delNum: "DEL-2026-004",
      pickNum: "PK-2026-004",
      customer: customer3,
      lead: leads[10],
      capacityKw: 3,
      template: template3kwOnGrid,
      status: "DISPATCHED",
      orderDate: new Date(Date.now() - 2 * 86400000),
      isExpired: false,
      jobStatus: "SCHEDULED",
      deliveryStatus: "IN_TRANSIT",
    },
    {
      index: 5,
      orderNum: "SO-2026-005",
      quoteNum: "Q-2026-005",
      jobNum: "JOB-2026-005",
      delNum: "DEL-2026-005",
      pickNum: "PK-2026-005",
      customer: customer4,
      lead: leads[2],
      capacityKw: 5,
      template: template5kwOnGrid,
      status: "CONFIRMED",
      orderDate: new Date(Date.now() - 1 * 86400000),
      isExpired: false,
      jobStatus: "SCHEDULED",
      deliveryStatus: "ASSIGNED",
    },
  ];

  for (const cfg of ordersConfig) {
    const is3kw = cfg.capacityKw === 3;
    const subtotal = is3kw ? 195000 : 310000;
    const gstAmount = Math.round(subtotal * 0.18);
    const totalAmount = subtotal + gstAmount;
    const installDate = cfg.orderDate;

    // Quote
    const quote = await prisma.quote.create({
      data: {
        companyId: company.id,
        customerId: cfg.customer.id,
        leadId: cfg.lead.id,
        packageTemplateId: cfg.template.id,
        createdById: salesUser.id,
        quoteNumber: cfg.quoteNum,
        status: "ACCEPTED",
        capacityKw: cfg.capacityKw,
        subtotal,
        gstRate: 18,
        gstAmount,
        totalAmount,
        subsidyAmount: 78000,
        netPayable: totalAmount - 78000,
        subsidyNote: "PM Surya Ghar subsidy eligible up to INR 78,000",
        acceptedAt: installDate,
        lines: {
          create: [
            { productId: monoPanel.id, description: "Mono PERC 540W Panel", quantity: is3kw ? 6 : 10, unitPrice: 13500, unitCost: 9500, lineTotal: (is3kw ? 6 : 10) * 13500 },
            { productId: is3kw ? onGrid3kw.id : onGrid5kw.id, description: is3kw ? "3kW On-Grid Inverter" : "5kW On-Grid Inverter", quantity: 1, unitPrice: is3kw ? 34000 : 52000, unitCost: is3kw ? 24000 : 38000, lineTotal: is3kw ? 34000 : 52000 },
            { productId: structure.id, description: "GI Structure Sets", quantity: cfg.capacityKw, unitPrice: 4800, unitCost: 3200, lineTotal: cfg.capacityKw * 4800 },
            { productId: installLabour.id, description: "Installation Labour", quantity: cfg.capacityKw, unitPrice: 7000, unitCost: 4000, lineTotal: cfg.capacityKw * 7000 },
          ],
        },
      },
    });

    // Sales Order
    const order = await prisma.salesOrder.create({
      data: {
        companyId: company.id,
        customerId: cfg.customer.id,
        quoteId: quote.id,
        createdById: salesUser.id,
        orderNumber: cfg.orderNum,
        status: cfg.status,
        capacityKw: cfg.capacityKw,
        revenue: totalAmount,
        subtotal,
        gstAmount,
        totalAmount,
        minAdvancePercent: 30,
        minAdvanceAmount: Math.round(totalAmount * 0.3),
        confirmedAt: installDate,
        dispatchedAt: ["DISPATCHED", "DELIVERED", "INSTALLATION_IN_PROGRESS", "COMPLETED"].includes(cfg.status) ? installDate : null,
        deliveredAt: ["DELIVERED", "INSTALLATION_IN_PROGRESS", "COMPLETED"].includes(cfg.status) ? installDate : null,
        completedAt: cfg.status === "COMPLETED" ? installDate : null,
      },
    });

    // Payment Milestones
    const advanceMilestone = await prisma.paymentMilestone.create({
      data: {
        companyId: company.id,
        orderId: order.id,
        name: "Advance Booking Token (30%)",
        stage: "BOOKING_ADVANCE",
        percentage: 30,
        amount: Math.round(totalAmount * 0.3),
        status: "PAID",
        paidAmount: Math.round(totalAmount * 0.3),
        paidAt: installDate,
      },
    });

    await prisma.payment.create({
      data: {
        companyId: company.id,
        orderId: order.id,
        milestoneId: advanceMilestone.id,
        amount: Math.round(totalAmount * 0.3),
        method: "UPI",
        status: "COMPLETED",
        transactionRef: `UPI-ADV-${cfg.index}-${Date.now().toString().slice(-4)}`,
        receiptNumber: `REC-ADV-${cfg.index}`,
        receivedAt: installDate,
        isVerified: true,
        verifiedById: accountantUser.id,
      },
    });

    if (["COMPLETED", "INSTALLATION_IN_PROGRESS", "DISPATCHED"].includes(cfg.status)) {
      const dispatchMilestone = await prisma.paymentMilestone.create({
        data: {
          companyId: company.id,
          orderId: order.id,
          name: "Material Dispatch (50%)",
          stage: "DISPATCH",
          percentage: 50,
          amount: Math.round(totalAmount * 0.5),
          status: "PAID",
          paidAmount: Math.round(totalAmount * 0.5),
          paidAt: installDate,
        },
      });

      await prisma.payment.create({
        data: {
          companyId: company.id,
          orderId: order.id,
          milestoneId: dispatchMilestone.id,
          amount: Math.round(totalAmount * 0.5),
          method: "BANK_TRANSFER",
          status: "COMPLETED",
          transactionRef: `NEFT-DISP-${cfg.index}-${Date.now().toString().slice(-4)}`,
          receiptNumber: `REC-DISP-${cfg.index}`,
          receivedAt: installDate,
          isVerified: true,
          verifiedById: accountantUser.id,
        },
      });
    }

    if (cfg.status === "COMPLETED") {
      const handoverMilestone = await prisma.paymentMilestone.create({
        data: {
          companyId: company.id,
          orderId: order.id,
          name: "Commissioning Handover (20%)",
          stage: "COMMISSIONING",
          percentage: 20,
          amount: totalAmount - Math.round(totalAmount * 0.8),
          status: "PAID",
          paidAmount: totalAmount - Math.round(totalAmount * 0.8),
          paidAt: installDate,
        },
      });

      await prisma.payment.create({
        data: {
          companyId: company.id,
          orderId: order.id,
          milestoneId: handoverMilestone.id,
          amount: totalAmount - Math.round(totalAmount * 0.8),
          method: "BANK_TRANSFER",
          status: "COMPLETED",
          transactionRef: `NEFT-BAL-${cfg.index}-${Date.now().toString().slice(-4)}`,
          receiptNumber: `REC-BAL-${cfg.index}`,
          receivedAt: installDate,
          isVerified: true,
          verifiedById: accountantUser.id,
        },
      });
    }

    // PickList tied to Hyderabad West Logistics Hub
    await prisma.pickList.create({
      data: {
        companyId: company.id,
        orderId: order.id,
        createdById: warehouseUser.id,
        warehouseId: whWest.id,
        deliveryAgentId: deliveryUser.id,
        pickNumber: cfg.pickNum,
        status: cfg.status === "CONFIRMED" ? "OPEN" : "COMPLETED",
        completedAt: cfg.status === "CONFIRMED" ? null : installDate,
        lines: {
          create: [
            { productId: monoPanel.id, requiredQty: is3kw ? 6 : 10, pickedQty: cfg.status === "CONFIRMED" ? 0 : (is3kw ? 6 : 10) },
            { productId: is3kw ? onGrid3kw.id : onGrid5kw.id, requiredQty: 1, pickedQty: cfg.status === "CONFIRMED" ? 0 : 1 },
            { productId: structure.id, requiredQty: cfg.capacityKw, pickedQty: cfg.status === "CONFIRMED" ? 0 : cfg.capacityKw },
            { productId: dcdb.id, requiredQty: 1, pickedQty: cfg.status === "CONFIRMED" ? 0 : 1 },
            { productId: acdb.id, requiredQty: 1, pickedQty: cfg.status === "CONFIRMED" ? 0 : 1 },
          ],
        },
      },
    });

    // Delivery Record
    await prisma.delivery.create({
      data: {
        companyId: company.id,
        orderId: order.id,
        customerId: cfg.customer.id,
        deliveryAgentId: deliveryUser.id,
        deliveryNumber: cfg.delNum,
        status: cfg.deliveryStatus,
        deliveryDate: installDate,
        deliveryAddress: cfg.customer.address,
        recipientPhone: cfg.customer.phone,
        deliveredTo: cfg.customer.name,
        latitude: cfg.customer.latitude,
        longitude: cfg.customer.longitude,
        addressConfirmed: true,
        customerAccepted: cfg.deliveryStatus === "DELIVERED",
        customerAcceptedAt: cfg.deliveryStatus === "DELIVERED" ? installDate : null,
        validatedAt: ["DELIVERED", "VALIDATED"].includes(cfg.deliveryStatus) ? installDate : null,
        deliveredAt: cfg.deliveryStatus === "DELIVERED" ? installDate : null,
        acceptanceNotes: cfg.deliveryStatus === "DELIVERED" ? "All serial numbers scanned, boxes intact without transit damage." : null,
      },
    });

    // Serial Numbers for Inverter & Panels
    const inverterProduct = is3kw ? onGrid3kw : onGrid5kw;
    const invSerialStr = is3kw ? `INV3K-HYD-00${cfg.index}` : `INV5K-HYD-00${cfg.index}`;
    const inverterSerial = await prisma.serialNumber.create({
      data: {
        companyId: company.id,
        productId: inverterProduct.id,
        orderId: order.id,
        customerId: cfg.customer.id,
        serial: invSerialStr,
        status: cfg.status === "COMPLETED" ? "INSTALLED" : cfg.status === "DISPATCHED" ? "DISPATCHED" : "RESERVED",
        scannedAt: installDate,
        deliveredAt: ["DELIVERED", "INSTALLATION_IN_PROGRESS", "COMPLETED"].includes(cfg.status) ? installDate : null,
        installedAt: cfg.status === "COMPLETED" ? installDate : null,
      },
    });

    // Inverter Warranty
    if (cfg.status === "COMPLETED") {
      const invWarrantyEnd = cfg.isExpired
        ? new Date(installDate.getTime() + 2 * 365 * 86400000) // Expired ~2 months ago
        : new Date(installDate.getTime() + 5 * 365 * 86400000); // 5-year active warranty

      await prisma.warranty.create({
        data: {
          companyId: company.id,
          serialNumberId: inverterSerial.id,
          customerId: cfg.customer.id,
          status: cfg.isExpired ? "EXPIRED" : "ACTIVE",
          startDate: installDate,
          endDate: invWarrantyEnd,
        },
      });
    }

    // Panels Serials (6 panels for 3kW, 10 for 5kW)
    const panelCount = is3kw ? 6 : 10;
    for (let p = 1; p <= panelCount; p++) {
      const panelSerialStr = `PAN540-HYD-00${cfg.index}-${p < 10 ? "0" + p : p}`;
      const panelSerial = await prisma.serialNumber.create({
        data: {
          companyId: company.id,
          productId: monoPanel.id,
          orderId: order.id,
          customerId: cfg.customer.id,
          serial: panelSerialStr,
          status: cfg.status === "COMPLETED" ? "INSTALLED" : cfg.status === "DISPATCHED" ? "DISPATCHED" : "RESERVED",
          scannedAt: installDate,
          deliveredAt: ["DELIVERED", "INSTALLATION_IN_PROGRESS", "COMPLETED"].includes(cfg.status) ? installDate : null,
          installedAt: cfg.status === "COMPLETED" ? installDate : null,
        },
      });

      // Panels warranty: 20 years active
      if (cfg.status === "COMPLETED") {
        await prisma.warranty.create({
          data: {
            companyId: company.id,
            serialNumberId: panelSerial.id,
            customerId: cfg.customer.id,
            status: "ACTIVE",
            startDate: installDate,
            endDate: new Date(installDate.getTime() + 20 * 365 * 86400000),
          },
        });
      }
    }

    // Installation Job with Verified Component Matrix & Signatures
    const sampleSignature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const verifiedConnections = [
      { name: "Module Mounting Structure (MMS)", category: "Structure", status: "CONNECTED_SUCCESSFULLY", reading: "Torqued to 12 Nm, Grounded" },
      { name: "Solar PV Panels Array Strings", category: "PV Array", status: "CONNECTED_SUCCESSFULLY", reading: "Voc: 382V DC, MC4 Locked" },
      { name: "DC Distribution Box (DCDB)", category: "DC Protection", status: "CONNECTED_SUCCESSFULLY", reading: "1000V DC Fuses & SPD Grounded" },
      { name: "Solar Inverter DC Input (MPPT)", category: "Inverter DC", status: "CONNECTED_SUCCESSFULLY", reading: "DC Isolator ON, Polarity Checked" },
      { name: "Solar Inverter AC Output", category: "Inverter AC", status: "CONNECTED_SUCCESSFULLY", reading: "234V AC, 50.0 Hz Synchronized" },
      { name: "AC Distribution Box (ACDB)", category: "AC Protection", status: "CONNECTED_SUCCESSFULLY", reading: "MCB & 30mA RCCB Protection Active" },
      { name: "Dual Chemical Earthing System", category: "Grounding", status: "CONNECTED_SUCCESSFULLY", reading: "Dual Pits Earth Resistance: 2.1 Ω" },
      { name: "Lightning Arrester (LA)", category: "Surge & Lightning", status: "CONNECTED_SUCCESSFULLY", reading: "ESE Rooftop Mast Clamped & Grounded" },
      { name: "DISCOM Bi-Directional Net-Meter", category: "Grid Sync", status: "CONNECTED_SUCCESSFULLY", reading: "Anti-Islanding Trip Tested (<2s)" },
      { name: "System Power Generation & Output", category: "Power Generation", status: "CONNECTED_SUCCESSFULLY", reading: `${cfg.capacityKw}.1 kW Active Generation` },
    ];

    const notesJson = JSON.stringify({
      technicianNotes: "Turnkey rooftop PV system commissioned and synchronized cleanly.",
      componentConnections: verifiedConnections,
      completedAt: installDate.toISOString(),
      completedBy: "Vikram Singh (Senior Technician)",
    });

    const job = await prisma.installationJob.create({
      data: {
        companyId: company.id,
        orderId: order.id,
        customerId: cfg.customer.id,
        technicianId: techUser.id,
        jobNumber: cfg.jobNum,
        status: cfg.jobStatus,
        scheduledAt: installDate,
        startTime: cfg.jobStatus === "SCHEDULED" ? null : new Date(installDate.getTime() + 9 * 3600000),
        endTime: cfg.jobStatus === "COMPLETED" ? new Date(installDate.getTime() + 17 * 3600000) : null,
        confirmedKw: cfg.capacityKw,
        standsInstalled: ["IN_PROGRESS", "COMPLETED"].includes(cfg.jobStatus),
        panelsInstalled: cfg.jobStatus === "COMPLETED",
        boxesInstalled: cfg.jobStatus === "COMPLETED",
        earthingCompleted: cfg.jobStatus === "COMPLETED",
        powerTestPassed: cfg.jobStatus === "COMPLETED",
        completedAt: cfg.jobStatus === "COMPLETED" ? new Date(installDate.getTime() + 17 * 3600000) : null,
        notes: cfg.jobStatus === "COMPLETED" ? notesJson : "Technician Vikram Singh dispatched on site with tools and PPE.",
        photos: cfg.jobStatus === "COMPLETED" ? {
          create: [
            {
              url: "https://res.cloudinary.com/wtverhni/image/upload/v1793504774/solar_management/installations/solar_pv_panels_array_1793504774198.svg",
              publicId: "solar_management/installations/solar_pv_panels_array_1793504774198",
              caption: "Solar PV Panels Array rooftop string mounting (540W Mono-PERC)"
            },
            {
              url: "https://res.cloudinary.com/wtverhni/image/upload/v1793504776/solar_management/installations/solar_inverter_wall_1793504776546.svg",
              publicId: "solar_management/installations/solar_inverter_wall_1793504776546",
              caption: "Solar Inverter wall installation with AC/DC isolator switches"
            },
          ],
        } : undefined,
        signature: cfg.jobStatus === "COMPLETED" ? {
          create: {
            customerId: cfg.customer.id,
            imageUrl: "https://res.cloudinary.com/wtverhni/image/upload/v1793504778/solar_management/signatures/customer_signature_1793504778530.svg",
            publicId: "solar_management/signatures/customer_signature_1793504778530",
            signedByName: cfg.customer.name,
            signedAt: new Date(installDate.getTime() + 17 * 3600000),
            acceptanceText: "I hereby confirm that all solar PV panels, inverter, distribution boxes, and safety grounding have been physically inspected, mounted, and tested for live generation in my presence. By signing below, I officially accept the installation handover, and I acknowledge that my manufacturer product & performance warranty period begins as of today.",
          },
        } : undefined,
      },
    });

    // Time entries for technician compensation & labor costing
    if (["IN_PROGRESS", "COMPLETED"].includes(cfg.jobStatus)) {
      await prisma.timeEntry.create({
        data: {
          companyId: company.id,
          userId: techUser.id,
          orderId: order.id,
          installationJobId: job.id,
          startTime: new Date(installDate.getTime() + 9 * 3600000),
          endTime: new Date(installDate.getTime() + 17 * 3600000),
          hours: 8,
          hourlyRate: 350,
          labourCost: 2800,
          approved: true,
          approvedAt: installDate,
          description: `Rooftop PV array assembly, string inverter mounting & grounding for ${order.orderNumber}.`,
        },
      });
    }

    // Direct auxiliary job costs (Logistics freight, earthing grouting, DISCOM inspection liaison)
    // Note: BOM equipment cost is already derived directly from quote.lines (quantity * unitCost)
    await prisma.costEntry.createMany({
      data: [
        { companyId: company.id, orderId: order.id, category: "LOGISTICS", description: "Logistics, transport & site freight", amount: 3500, incurredAt: installDate },
        { companyId: company.id, orderId: order.id, category: "CIVIL_WORKS", description: "Chemical earthing pit boring & safety grouting", amount: 3200, incurredAt: installDate },
        { companyId: company.id, orderId: order.id, category: "PERMIT_FEES", description: "DISCOM solar net-metering liaisoning fee", amount: 2500, incurredAt: installDate },
      ],
    });

    // Auto-generate Invoices for confirmed/delivered/completed orders
    const invStatus = cfg.status === "COMPLETED" ? "PAID" : cfg.status === "INSTALLATION_IN_PROGRESS" ? "PARTIALLY_PAID" : "ISSUED";
    await prisma.invoice.create({
      data: {
        companyId: company.id,
        customerId: cfg.customer.id,
        orderId: order.id,
        createdById: accountantUser.id,
        invoiceNumber: `INV-2026-00${cfg.index}`,
        status: invStatus,
        subtotal,
        gstAmount,
        totalAmount,
        amountPaid: invStatus === "PAID" ? totalAmount : invStatus === "PARTIALLY_PAID" ? Math.round(totalAmount * 0.8) : Math.round(totalAmount * 0.3),
        amountDue: invStatus === "PAID" ? 0 : invStatus === "PARTIALLY_PAID" ? totalAmount - Math.round(totalAmount * 0.8) : totalAmount - Math.round(totalAmount * 0.3),
        issuedAt: installDate,
        dueDate: new Date(installDate.getTime() + 15 * 86400000),
        paidAt: invStatus === "PAID" ? installDate : null,
        lines: {
          create: [
            { productId: monoPanel.id, description: "Solar PV Modules", quantity: is3kw ? 6 : 10, unitPrice: 13500, lineTotal: (is3kw ? 6 : 10) * 13500 },
            { productId: inverterProduct.id, description: "Solar String Inverter", quantity: 1, unitPrice: is3kw ? 34000 : 52000, lineTotal: is3kw ? 34000 : 52000 },
            { productId: structure.id, description: "Rooftop Mounting Structure", quantity: cfg.capacityKw, unitPrice: 4800, lineTotal: cfg.capacityKw * 4800 },
            { productId: installLabour.id, description: "Installation & Commissioning Labour", quantity: cfg.capacityKw, unitPrice: 7000, lineTotal: cfg.capacityKw * 7000 },
          ],
        },
      },
    });

    // PM Surya Ghar Subsidy Application
    await prisma.subsidyApplication.create({
      data: {
        companyId: company.id,
        customerId: cfg.customer.id,
        applicationNumber: `PMSURYA-2026-${1000 + cfg.index}`,
        status: cfg.isExpired ? "RECEIVED" : cfg.status === "COMPLETED" ? "UNDER_REVIEW" : "DOCUMENTS_PENDING",
        expectedAmount: 78000,
        receivedAmount: cfg.isExpired ? 78000 : 0,
        documentsSubmitted: true,
        submittedAt: installDate,
        approvedAt: cfg.isExpired ? new Date(installDate.getTime() + 30 * 86400000) : null,
        receivedAt: cfg.isExpired ? new Date(installDate.getTime() + 60 * 86400000) : null,
        authority: "Telangana State Renewable Energy Development Corporation (TSREDCO)",
        notes: `PM Surya Ghar Muft Bijli Yojana National Portal Application for ${cfg.customer.name}`,
      },
    });
  }

  // 13. Additional Available Serial Numbers in Warehouse Stock for Barcode Scanning Demo
  console.log("Generating 50+ Available Serial Numbers in Warehouse for live Barcode Scanning...");
  for (let s = 10; s <= 40; s++) {
    await prisma.serialNumber.create({
      data: {
        companyId: company.id,
        productId: monoPanel.id,
        serial: `PAN540-HYD-STOCK-${1000 + s}`,
        status: "IN_STOCK",
      },
    });
  }
  for (let s = 10; s <= 25; s++) {
    await prisma.serialNumber.create({
      data: {
        companyId: company.id,
        productId: onGrid3kw.id,
        serial: `INV3K-HYD-STOCK-${2000 + s}`,
        status: "IN_STOCK",
      },
    });
  }

  // 14. Create 4 Service Tickets (In-Warranty, Expired-Warranty, New, Assigned)
  console.log("Generating 4 realistic Service Tickets for Support & Warranty testing...");
  const expiredInverter = await prisma.serialNumber.findFirst({
    where: { serial: "INV3K-HYD-001" },
  });
  const activeInverter = await prisma.serialNumber.findFirst({
    where: { serial: "INV3K-HYD-002" },
  });

  // Ticket 1: In-Warranty Service (Parts & Labour priced 0)
  await prisma.ticket.create({
    data: {
      companyId: company.id,
      customerId: customer1.id,
      createdById: supportUser.id,
      assignedToId: techUser.id,
      ticketNumber: "TCK-2026-001",
      title: "Inverter Error Code E04 (Grid Over-voltage)",
      description: "Customer reporting inverter tripping in afternoons due to DISCOM grid surge.",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      lines: {
        create: [
          {
            type: "LABOUR",
            productId: onGrid3kw.id,
            serialNumberId: activeInverter?.id,
            description: "On-Grid Inverter Firmware Recalibration & Grid parameter tuning",
            isWarrantyCovered: true,
            unitPrice: 0,
            unitCost: 0,
            lineTotal: 0,
          },
        ],
      },
    },
  });

  // Ticket 2: Expired-Warranty Service (Inverter replacement generating invoice)
  const ticketExpired = await prisma.ticket.create({
    data: {
      companyId: company.id,
      customerId: customer1.id,
      createdById: supportUser.id,
      assignedToId: techUser.id,
      ticketNumber: "TCK-2026-002",
      title: "Inverter DSP Board Component Failure (Out of Warranty)",
      description: "2.2-year old inverter motherboard failure. Customer requires new replacement board.",
      status: "RESOLVED",
      priority: "HIGH",
      lines: {
        create: [
          {
            type: "PART",
            productId: onGrid3kw.id,
            serialNumberId: expiredInverter?.id,
            description: "Replacement DSP Power Control Board",
            isWarrantyCovered: false,
            unitPrice: 8500,
            unitCost: 6000,
            lineTotal: 8500,
          },
          {
            type: "LABOUR",
            description: "On-site board replacement & calibration labour",
            isWarrantyCovered: false,
            unitPrice: 1500,
            unitCost: 500,
            lineTotal: 1500,
          },
        ],
      },
    },
  });

  // Auto-generate invoice for expired service ticket
  await prisma.invoice.create({
    data: {
      companyId: company.id,
      customerId: customer1.id,
      createdById: supportUser.id,
      ticketId: ticketExpired.id,
      invoiceNumber: "INV-SRV-2026-001",
      status: "ISSUED",
      subtotal: 10000,
      gstAmount: 1800,
      totalAmount: 11800,
      amountDue: 11800,
      amountPaid: 0,
      lines: {
        create: [
          { productId: onGrid3kw.id, description: "Replacement DSP Power Control Board (Out of Warranty)", quantity: 1, unitPrice: 8500, lineTotal: 8500 },
          { description: "Technician Service & Calibration Labour", quantity: 1, unitPrice: 1500, lineTotal: 1500 },
        ],
      },
    },
  });

  // Ticket 3: New Unassigned Ticket
  await prisma.ticket.create({
    data: {
      companyId: company.id,
      customerId: customer2.id,
      createdById: customerUser.id,
      ticketNumber: "TCK-2026-003",
      title: "Quarterly Solar Panel Dust Cleaning Enquiry",
      description: "Requesting technician team for water jet washing of 6 rooftop modules.",
      status: "NEW",
      priority: "LOW",
    },
  });

  // Ticket 4: Assigned Ticket
  await prisma.ticket.create({
    data: {
      companyId: company.id,
      customerId: customer3.id,
      createdById: customerUser.id,
      assignedToId: techUser.id,
      ticketNumber: "TCK-2026-004",
      title: "Smart Meter Wi-Fi Dongle Re-pairing",
      description: "Customer changed home Wi-Fi SSID; monitoring app is currently showing offline.",
      status: "ASSIGNED",
      priority: "LOW",
    },
  });

  // 15. Create Rich In-App Notifications for System Users
  const notifs = [
    { userId: adminUser.id, type: "PAYMENT_RECEIVED", title: "Advance Payment Received", message: "Customer Ravi Kumar paid INR 69,030 via UPI for order SO-2026-002." },
    { userId: adminUser.id, type: "JOB_CREATED", title: "Installation Completed", message: "Technician Vikram Singh completed installation for JOB-2026-002 with signed customer acceptance." },
    { userId: techUser.id, type: "JOB_ASSIGNED", title: "New Installation Assigned", message: "Admin assigned you to Installation Job JOB-2026-003 at Kukatpally." },
    { userId: warehouseUser.id, type: "PICK_LIST_CREATED", title: "Material Pick List Ready", message: "Pick List PK-2026-005 generated for Hyderabad West Logistics Hub." },
    { userId: deliveryUser.id, type: "DISPATCH_READY", title: "Order Dispatched for Delivery", message: "Delivery DEL-2026-004 assigned to your delivery van. 6 panels & 1 inverter loaded." },
    { userId: salesUser.id, type: "LEAD_ASSIGNED", title: "New Lead Assigned", message: "Web inquiry from Amit Joshi (3kW Rooftop, Kondapur) assigned to you." },
    { userId: customerUser.id, type: "DELIVERY_COMPLETED", title: "Warranty Period Activated", message: "Your 3 kW On-Grid solar plant is commissioned. Your 20-year module warranty is now ACTIVE!" },
  ];

  for (const n of notifs) {
    await prisma.notification.create({
      data: {
        companyId: company.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        status: "UNREAD",
      },
    });
  }

  console.log("==================================================================");
  console.log("  SunPower Solutions — Seeding Finished Successfully!           ");
  console.log("==================================================================");
  console.log("Default Login Credentials (All passwords: password123 OR SunPower@2024):");
  console.log("  - ADMIN:          admin@sunpower.com");
  console.log("  - SALESMAN:       sales@sunpower.com");
  console.log("  - ACCOUNTANT:     accountant@sunpower.com");
  console.log("  - WAREHOUSE:      warehouse@sunpower.com");
  console.log("  - TECHNICIAN:     tech@sunpower.com");
  console.log("  - DELIVERY_AGENT: delivery@sunpower.com");
  console.log("  - SUPPORT:        support@sunpower.com");
  console.log("  - CUSTOMER:       customer@sunpower.com (or phone: 9000000001)");
  console.log("  - CUSTOMER 2:     sita@sunpower.com     (or phone: 9000000002)");
  console.log("==================================================================");
}

main()
  .catch((e) => {
    console.error("Seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
