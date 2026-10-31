const bcrypt = require("bcrypt");
const prisma = require("../src/config/prisma");

async function main() {
  console.log("Starting SunPower Solutions database seeding...");

  // Clear existing records in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.signature.deleteMany();
  await prisma.jobPhoto.deleteMany();
  await prisma.installationJob.deleteMany();
  await prisma.warranty.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.ticketLine.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.costEntry.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.pickLine.deleteMany();
  await prisma.pickList.deleteMany();
  await prisma.serialNumber.updateMany({ data: { replacesSerialId: null } });
  await prisma.serialNumber.deleteMany();
  await prisma.stockMove.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.quoteLine.deleteMany();
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

  console.log("Cleaned existing data.");

  // 1. Create Company
  const company = await prisma.company.create({
    data: {
      name: "SunPower Solutions Pvt Ltd",
      slug: "sunpower",
      email: "info@sunpowersolutions.com",
      phone: "+91 98765 00000",
      address: "Plot 42, Energy Park, Hyderabad, Telangana 500081",
      gstNumber: "36AABCS1234F1Z8",
      isActive: true,
    },
  });

  console.log(`Created Company: ${company.name}`);

  // 2. Create Users for each role (Password: password123)
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
  ]);

  const [adminUser, salesUser, warehouseUser, techUser, supportUser, customerUser] = users;
  console.log("Created 6 users (ADMIN, SALESMAN, WAREHOUSE, TECHNICIAN, SUPPORT, CUSTOMER).");

  // 3. Create 20 Products
  const productsData = [
    // Panels
    { sku: "PAN-540-MONO", name: "Mono PERC 540W Tier-1 Solar PV Module", category: "PANEL", isSerialTracked: true, warrantyYears: 20, costPrice: 9500, salePrice: 13500, stockQty: 180 },
    { sku: "PAN-330-POLY", name: "Polycrystalline 330W Solar PV Module", category: "PANEL", isSerialTracked: true, warrantyYears: 20, costPrice: 5800, salePrice: 8200, stockQty: 90 },
    { sku: "PAN-550-BIFACIAL", name: "Bi-facial Dual Glass 550W Module", category: "PANEL", isSerialTracked: true, warrantyYears: 25, costPrice: 11000, salePrice: 15500, stockQty: 120 },
    // Inverters
    { sku: "INV-3KW-ONGRID", name: "3 kW Single-Phase On-Grid String Inverter", category: "INVERTER", isSerialTracked: true, warrantyYears: 2, costPrice: 24000, salePrice: 34000, stockQty: 25 },
    { sku: "INV-5KW-ONGRID", name: "5 kW Three-Phase On-Grid String Inverter", category: "INVERTER", isSerialTracked: true, warrantyYears: 2, costPrice: 38000, salePrice: 52000, stockQty: 20 },
    { sku: "INV-3KW-HYBRID", name: "3 kW Hybrid Bidirectional Inverter", category: "INVERTER", isSerialTracked: true, warrantyYears: 2, costPrice: 42000, salePrice: 58000, stockQty: 12 },
    { sku: "INV-5KW-OFFGRID", name: "5 kW Pure Sine Wave Off-Grid Inverter", category: "INVERTER", isSerialTracked: true, warrantyYears: 2, costPrice: 46000, salePrice: 64000, stockQty: 8 },
    // Batteries
    { sku: "BAT-48V-100AH", name: "Lithium Iron Phosphate (LiFePO4) 48V 100Ah", category: "BATTERY", isSerialTracked: true, warrantyYears: 2, costPrice: 62000, salePrice: 84000, stockQty: 15 },
    { sku: "BAT-12V-150AH", name: "Solar Tubular Lead Acid C10 12V 150Ah", category: "BATTERY", isSerialTracked: true, warrantyYears: 2, costPrice: 11500, salePrice: 16500, stockQty: 30 },
    // Structures
    { sku: "STR-GI-1KW", name: "Hot-Dip Galvanized Rooftop Structure (per kW)", category: "STRUCTURE", isSerialTracked: false, warrantyYears: 10, costPrice: 3200, salePrice: 4800, stockQty: 150 },
    { sku: "STR-ELEVATED-1KW", name: "Elevated High-Rise Rooftop Structure (per kW)", category: "STRUCTURE", isSerialTracked: false, warrantyYears: 10, costPrice: 5500, salePrice: 8500, stockQty: 60 },
    // Electrical & BOS
    { sku: "DCDB-1IN-1OUT", name: "DC Distribution Box 1000V with SPD & Fuse", category: "BOS", isSerialTracked: false, warrantyYears: 2, costPrice: 1800, salePrice: 2800, stockQty: 50 },
    { sku: "ACDB-1PH", name: "AC Distribution Box Single-Phase with MCB & SPD", category: "BOS", isSerialTracked: false, warrantyYears: 2, costPrice: 1600, salePrice: 2500, stockQty: 45 },
    { sku: "ACDB-3PH", name: "AC Distribution Box Three-Phase with Isolator", category: "BOS", isSerialTracked: false, warrantyYears: 2, costPrice: 2800, salePrice: 4200, stockQty: 35 },
    { sku: "CBL-DC-4SQMM", name: "Solar DC Copper Cable 4 sq mm (meter)", category: "CABLE", isSerialTracked: false, warrantyYears: 5, costPrice: 42, salePrice: 65, stockQty: 2500 },
    { sku: "CBL-AC-6SQMM", name: "Armoured AC Copper Cable 6 sq mm (meter)", category: "CABLE", isSerialTracked: false, warrantyYears: 5, costPrice: 75, salePrice: 115, stockQty: 1800 },
    { sku: "EARTH-ROD-2M", name: "Copper Bonded Chemical Earthing Electrode 2m", category: "EARTHING", isSerialTracked: false, warrantyYears: 5, costPrice: 1200, salePrice: 1950, stockQty: 100 },
    { sku: "EARTH-COMPOUND", name: "BFC Conductive Earth Enhancing Compound 25kg", category: "EARTHING", isSerialTracked: false, warrantyYears: 0, costPrice: 450, salePrice: 750, stockQty: 80 },
    { sku: "LIGHTNING-ARR", name: "Early Streamer Emission (ESE) Lightning Arrester", category: "SAFETY", isSerialTracked: false, warrantyYears: 3, costPrice: 4800, salePrice: 7500, stockQty: 25 },
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
  console.log(`Created ${products.length} products with serial tracking and warranty configurations.`);

  // 4. Create 3 Package Templates with scaled BOM Lines
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

  // Template 1: 3 kW On-Grid
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

  // Template 2: 3 kW Off-Grid
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

  // Template 3: 5 kW On-Grid
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

  // 5. Create Customers
  const customer1 = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: "Ramesh Sharma",
      email: "ramesh.sharma@example.com",
      phone: "9876543210",
      address: "House 12, Jubilee Hills, Hyderabad",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500033",
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: "Ananya Deshmukh",
      email: "ananya.d@example.com",
      phone: "9812345678",
      address: "Flat 401, Lotus Towers, Gachibowli, Hyderabad",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500032",
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: "Venkat Raman",
      email: "venkat.r@example.com",
      phone: "9845012345",
      address: "Villa 8, Green Meadows, Madhapur, Hyderabad",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500081",
    },
  });

  // 6. Create 10 Leads in different stages
  const leadsData = [
    { title: "3kW Rooftop Enquiry - Kondapur", contactName: "Amit Joshi", phone: "9811100001", stage: "NEW", shadowFreeArea: false, monthlyBill: false, gridSuitable: false },
    { title: "5kW Villa Solar Setup", contactName: "Praveen Rao", phone: "9811100002", stage: "CONTACTED", shadowFreeArea: true, monthlyBill: false, gridSuitable: false, lastContactAt: new Date() },
    { title: "4kW Qualified Residential", contactName: "Sneha Kapoor", phone: "9811100003", stage: "QUALIFIED", shadowFreeArea: true, monthlyBill: true, gridSuitable: true, monthlyBillAmount: 4800, desiredCapacityKw: 4 },
    { title: "Site Survey Booked", contactName: "Deepak Nair", phone: "9811100004", stage: "SURVEY_SCHEDULED", shadowFreeArea: true, monthlyBill: true, gridSuitable: true, monthlyBillAmount: 3500, desiredCapacityKw: 3 },
    { title: "Survey Measurements Done", contactName: "Meera Sen", phone: "9811100005", stage: "SURVEY_DONE", shadowFreeArea: true, monthlyBill: true, gridSuitable: true, monthlyBillAmount: 6200, desiredCapacityKw: 5 },
    { title: "Survey Approved - Ready for Quote", contactName: "Rajesh Guha", phone: "9811100006", stage: "SURVEY_APPROVED", shadowFreeArea: true, monthlyBill: true, gridSuitable: true, monthlyBillAmount: 4000, desiredCapacityKw: 3, customerId: customer1.id },
    { title: "Quotation Sent to Client", contactName: "Sunita Roy", phone: "9811100007", stage: "QUOTED", shadowFreeArea: true, monthlyBill: true, gridSuitable: true, monthlyBillAmount: 5500, desiredCapacityKw: 4, customerId: customer2.id },
    { title: "Confirmed Commercial Contract", contactName: "Karthik Iyer", phone: "9811100008", stage: "WON", shadowFreeArea: true, monthlyBill: true, gridSuitable: true, monthlyBillAmount: 12000, desiredCapacityKw: 10, customerId: customer3.id },
    { title: "Budget Constraint", contactName: "Gopal Krishna", phone: "9811100009", stage: "LOST", lossReason: "Customer opted for low-quality local vendor with 50% cut rate", shadowFreeArea: false, monthlyBill: true, gridSuitable: true },
    { title: "Old Inactive Lead (Archived)", contactName: "Harish Pillai", phone: "9811100010", stage: "CONTACTED", archivedAt: new Date(Date.now() - 30 * 86400000), notes: "Customer shifted out of state" },
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
  console.log(`Created 10 Leads across all lifecycle stages.`);

  // Create Survey for Lead 6 (SURVEY_APPROVED) so Quotes can be created
  const approvedSurvey = await prisma.survey.create({
    data: {
      companyId: company.id,
      leadId: leads[5].id, // SURVEY_APPROVED lead
      status: "APPROVED",
      scheduledAt: new Date(Date.now() - 3 * 86400000),
      completedAt: new Date(Date.now() - 2 * 86400000),
      approvedAt: new Date(Date.now() - 1 * 86400000),
      surveyedById: techUser.id,
      roofType: "RCC Flat Terrace",
      roofAreaSqFt: 650,
      shadowFreeArea: true,
      monthlyBill: true,
      gridSuitable: true,
      recommendedKw: 3,
      notes: "Clean south-facing roof area, strong RCC parapet, existing 3-phase meter.",
      photos: {
        create: [
          { url: "https://res.cloudinary.com/demo/image/upload/sample.jpg", caption: "Terrace South View" },
          { url: "https://res.cloudinary.com/demo/image/upload/sample.jpg", caption: "Distribution Board Location" },
        ],
      },
    },
  });

  // 7. Create 5 Completed Installs with Serials & Warranties (1 already expired)
  console.log("Generating 5 completed installations with serials and warranties...");

  for (let i = 1; i <= 5; i++) {
    const isExpired = i === 1; // First job has expired warranty
    const installDate = isExpired
      ? new Date(Date.now() - 800 * 86400000) // ~2.2 years ago
      : new Date(Date.now() - (6 - i) * 30 * 86400000);

    const quoteNum = `Q-2026-00${i}`;
    const orderNum = `SO-2026-00${i}`;
    const jobNum = `JOB-2026-00${i}`;
    const pickNum = `PK-2026-00${i}`;
    const delNum = `DEL-2026-00${i}`;

    const quote = await prisma.quote.create({
      data: {
        companyId: company.id,
        customerId: customer1.id,
        leadId: leads[5].id,
        packageTemplateId: template3kwOnGrid.id,
        createdById: salesUser.id,
        quoteNumber: quoteNum,
        status: "ACCEPTED",
        capacityKw: 3,
        subtotal: 195000,
        gstRate: 18,
        gstAmount: 35100,
        totalAmount: 230100,
        subsidyNote: "PM Surya Ghar subsidy eligible up to INR 78,000",
        lines: {
          create: [
            { productId: monoPanel.id, description: "Mono PERC 540W Panel", quantity: 6, unitPrice: 13500, unitCost: 9500, lineTotal: 81000 },
            { productId: onGrid3kw.id, description: "3kW On-Grid Inverter", quantity: 1, unitPrice: 34000, unitCost: 24000, lineTotal: 34000 },
            { productId: structure.id, description: "GI Structure 3kW", quantity: 3, unitPrice: 4800, unitCost: 3200, lineTotal: 14400 },
            { productId: installLabour.id, description: "Installation Labour", quantity: 3, unitPrice: 7000, unitCost: 4000, lineTotal: 21000 },
          ],
        },
      },
    });

    const order = await prisma.salesOrder.create({
      data: {
        companyId: company.id,
        customerId: customer1.id,
        quoteId: quote.id,
        createdById: salesUser.id,
        orderNumber: orderNum,
        status: "COMPLETED",
        capacityKw: 3,
        revenue: 230100,
        subtotal: 195000,
        gstAmount: 35100,
        totalAmount: 230100,
        confirmedAt: installDate,
        dispatchedAt: installDate,
        deliveredAt: installDate,
        completedAt: installDate,
        payments: {
          create: [
            { companyId: company.id, amount: 50000, method: "UPI", status: "COMPLETED", transactionRef: `UPI-ADV-${i}`, receivedAt: installDate },
            { companyId: company.id, amount: 180100, method: "BANK_TRANSFER", status: "COMPLETED", transactionRef: `NEFT-BAL-${i}`, receivedAt: installDate },
          ],
        },
      },
    });

    // Create PickList
    await prisma.pickList.create({
      data: {
        companyId: company.id,
        orderId: order.id,
        createdById: warehouseUser.id,
        pickNumber: pickNum,
        status: "COMPLETED",
        completedAt: installDate,
        lines: {
          create: [
            { productId: monoPanel.id, requiredQty: 6, pickedQty: 6 },
            { productId: onGrid3kw.id, requiredQty: 1, pickedQty: 1 },
          ],
        },
      },
    });

    // Delivery record
    const delivery = await prisma.delivery.create({
      data: {
        companyId: company.id,
        orderId: order.id,
        customerId: customer1.id,
        deliveryNumber: delNum,
        status: "DELIVERED",
        deliveryDate: installDate,
        validatedAt: installDate,
        deliveredAt: installDate,
      },
    });

    // Create Serial Numbers & Warranties for 6 panels and 1 inverter
    const inverterSerialStr = `INV3K-SN-00${i}`;
    const inverterSerial = await prisma.serialNumber.create({
      data: {
        companyId: company.id,
        productId: onGrid3kw.id,
        orderId: order.id,
        customerId: customer1.id,
        serial: inverterSerialStr,
        status: "INSTALLED",
        scannedAt: installDate,
        deliveredAt: installDate,
        installedAt: installDate,
      },
    });

    // Inverter warranty (2 years if expired scenario, else 5 years)
    const invWarrantyEnd = isExpired
      ? new Date(installDate.getTime() + 2 * 365 * 86400000) // Expired ~2 months ago
      : new Date(installDate.getTime() + 5 * 365 * 86400000);

    const invWarrantyStatus = isExpired ? "EXPIRED" : "ACTIVE";

    await prisma.warranty.create({
      data: {
        companyId: company.id,
        serialNumberId: inverterSerial.id,
        customerId: customer1.id,
        status: invWarrantyStatus,
        startDate: installDate,
        endDate: invWarrantyEnd,
      },
    });

    // Panels serials
    for (let p = 1; p <= 6; p++) {
      const panelSerialStr = `PAN540-SN-00${i}-${p}`;
      const panelSerial = await prisma.serialNumber.create({
        data: {
          companyId: company.id,
          productId: monoPanel.id,
          orderId: order.id,
          customerId: customer1.id,
          serial: panelSerialStr,
          status: "INSTALLED",
          scannedAt: installDate,
          deliveredAt: installDate,
          installedAt: installDate,
        },
      });

      // Panels warranty: 20 years
      await prisma.warranty.create({
        data: {
          companyId: company.id,
          serialNumberId: panelSerial.id,
          customerId: customer1.id,
          status: "ACTIVE",
          startDate: installDate,
          endDate: new Date(installDate.getTime() + 20 * 365 * 86400000),
        },
      });
    }

    // Installation Job with all checklist items true, photos, and customer signature
    const job = await prisma.installationJob.create({
      data: {
        companyId: company.id,
        orderId: order.id,
        customerId: customer1.id,
        technicianId: techUser.id,
        jobNumber: jobNum,
        status: "COMPLETED",
        scheduledAt: installDate,
        startTime: new Date(installDate.getTime() + 9 * 3600000),
        endTime: new Date(installDate.getTime() + 17 * 3600000),
        confirmedKw: 3,
        standsInstalled: true,
        panelsInstalled: true,
        boxesInstalled: true,
        earthingCompleted: true,
        powerTestPassed: true,
        completedAt: new Date(installDate.getTime() + 17 * 3600000),
        notes: "Seamless installation. String Voc 380V DC, Grid Sync clean.",
        photos: {
          create: [
            { url: "https://res.cloudinary.com/demo/image/upload/sample.jpg", caption: "Completed Array" },
            { url: "https://res.cloudinary.com/demo/image/upload/sample.jpg", caption: "Inverter Mounting & Cabling" },
          ],
        },
        signature: {
          create: {
            customerId: customer1.id,
            imageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
            signedByName: customer1.name,
            signedAt: new Date(installDate.getTime() + 17 * 3600000),
            acceptanceText: "Confirmed installation complete and power output tested.",
          },
        },
      },
    });

    // Add Time Entry for technician payout tracking
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
      },
    });

    // Add Subsidy Tracker entry for customer
    await prisma.subsidyApplication.create({
      data: {
        companyId: company.id,
        customerId: customer1.id,
        applicationNumber: `PMSURYA-2026-${1000 + i}`,
        status: isExpired ? "RECEIVED" : "UNDER_REVIEW",
        expectedAmount: 78000,
        receivedAmount: isExpired ? 78000 : 0,
        documentsSubmitted: true,
        submittedAt: installDate,
        approvedAt: isExpired ? new Date(installDate.getTime() + 30 * 86400000) : null,
        receivedAt: isExpired ? new Date(installDate.getTime() + 60 * 86400000) : null,
        authority: "Telangana State Renewable Energy Development Corporation (TSREDCO)",
      },
    });
  }

  // 8. Create 1 Loss-Making Job to satisfy Rule 9
  console.log("Generating 1 loss-making job (revenue < BOM + tech costs)...");
  const lossOrderNum = "SO-2026-LOSS";
  const lossQuote = await prisma.quote.create({
    data: {
      companyId: company.id,
      customerId: customer2.id,
      leadId: leads[6].id,
      packageTemplateId: template3kwOnGrid.id,
      createdById: salesUser.id,
      quoteNumber: "Q-2026-LOSS",
      status: "ACCEPTED",
      capacityKw: 3,
      subtotal: 120000, // heavily underpriced
      gstRate: 18,
      gstAmount: 21600,
      totalAmount: 141600,
    },
  });

  const lossOrder = await prisma.salesOrder.create({
    data: {
      companyId: company.id,
      customerId: customer2.id,
      quoteId: lossQuote.id,
      createdById: salesUser.id,
      orderNumber: lossOrderNum,
      status: "COMPLETED",
      capacityKw: 3,
      revenue: 141600,
      subtotal: 120000,
      gstAmount: 21600,
      totalAmount: 141600,
      confirmedAt: new Date(Date.now() - 10 * 86400000),
      completedAt: new Date(Date.now() - 2 * 86400000),
    },
  });

  // Cost entries making it clearly negative margin
  // BOM Cost: ~125,000 + Extra civil structural damages: 30,000 + 40 hours tech labour: 14,000 => Total costs ~169,000 vs Revenue 141,600 = LOSS (-27,400)
  await prisma.costEntry.createMany({
    data: [
      { companyId: company.id, orderId: lossOrder.id, category: "BOM_PURCHASE", description: "BOM equipment procurement cost", amount: 125000 },
      { companyId: company.id, orderId: lossOrder.id, category: "CIVIL_REPAIR", description: "Terrace waterproofing repair due to existing roof leak", amount: 30000 },
      { companyId: company.id, orderId: lossOrder.id, category: "LOGISTICS", description: "Crane rental for high-rise panel lifting", amount: 8000 },
    ],
  });

  await prisma.timeEntry.create({
    data: {
      companyId: company.id,
      userId: techUser.id,
      orderId: lossOrder.id,
      startTime: new Date(Date.now() - 5 * 86400000),
      endTime: new Date(Date.now() - 3 * 86400000),
      hours: 40,
      hourlyRate: 350,
      labourCost: 14000,
      approved: true,
      description: "Complex elevated structure mounting with repeated re-drilling.",
    },
  });

  // 9. Create 3 Service Tickets (Rule 8: in-warranty parts=0, expired-warranty parts billed)
  console.log("Generating 3 service tickets (in-warranty, expired-warranty, and new)...");

  // Fetch the expired inverter serial and an active inverter serial
  const expiredSerial = await prisma.serialNumber.findFirst({
    where: { serial: "INV3K-SN-001" },
  });
  const activeSerial = await prisma.serialNumber.findFirst({
    where: { serial: "INV3K-SN-002" },
  });

  // Ticket 1: In-Warranty Service (Parts & Labour priced 0)
  const ticketInWarranty = await prisma.ticket.create({
    data: {
      companyId: company.id,
      customerId: customer1.id,
      createdById: supportUser.id,
      assignedToId: techUser.id,
      ticketNumber: "TCK-2026-001",
      title: "Inverter Error Code E04 (Grid Over-voltage)",
      description: "Customer reporting inverter tripping in afternoons.",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      lines: {
        create: [
          {
            type: "LABOUR",
            productId: onGrid3kw.id,
            serialNumberId: activeSerial?.id,
            description: "On-Grid Inverter Firmware Recalibration & Grid parameter tune",
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
      title: "Complete Inverter Display Blank (Out of Warranty)",
      description: "2.2 year old inverter motherboard failure. Customer requires new replacement board.",
      status: "RESOLVED",
      priority: "HIGH",
      lines: {
        create: [
          {
            type: "PART",
            productId: onGrid3kw.id,
            serialNumberId: expiredSerial?.id,
            description: "Replacement DSP Power Control Board",
            isWarrantyCovered: false,
            unitPrice: 8500,
            unitCost: 6000,
            lineTotal: 8500,
          },
          {
            type: "LABOUR",
            description: "On-site board replacement & testing labour",
            isWarrantyCovered: false,
            unitPrice: 1500,
            unitCost: 500,
            lineTotal: 1500,
          },
        ],
      },
    },
  });

  // Auto-generate invoice for expired ticket
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
      description: "Requesting technician team for water jet washing of 10 panels.",
      status: "NEW",
      priority: "LOW",
    },
  });

  console.log("Seeding finished successfully!");
  console.log("-------------------------------------------------------------------");
  console.log("Default Login Credentials (All passwords: password123):");
  console.log("  - ADMIN:      admin@sunpower.com");
  console.log("  - SALESMAN:   sales@sunpower.com");
  console.log("  - WAREHOUSE:  warehouse@sunpower.com");
  console.log("  - TECHNICIAN: tech@sunpower.com");
  console.log("  - SUPPORT:    support@sunpower.com");
  console.log("  - CUSTOMER:   customer@sunpower.com (or phone: 9876543210)");
  console.log("-------------------------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
