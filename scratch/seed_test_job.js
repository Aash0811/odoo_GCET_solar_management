const prisma = require('../server/src/config/prisma');

async function main() {
  const company = await prisma.company.findFirst();
  const customer = await prisma.customer.findFirst({ where: { email: 'customer@sunpower.com' } });
  const tech = await prisma.user.findFirst({ where: { role: 'TECHNICIAN' } });
  const sales = await prisma.user.findFirst({ where: { role: 'SALESMAN' } });
  const pkg = await prisma.packageTemplate.findFirst();

  // Create or get lead
  let lead = await prisma.lead.findFirst({ where: { customerId: customer.id } });
  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        companyId: company.id,
        customerId: customer.id,
        assignedToId: sales.id,
        title: 'Rooftop Solar 3kW Inquiry',
        contactName: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address || 'Hyderabad',
        stage: 'WON',
        source: 'WEBSITE',
      },
    });
  }

  const monoPanel = await prisma.product.findFirst({ where: { sku: 'PAN-540-MONO' } });
  const inverter = await prisma.product.findFirst({ where: { sku: 'INV-3KW-ONGRID' } });
  const structure = await prisma.product.findFirst({ where: { sku: 'STR-GI-1KW' } });
  const dcdb = await prisma.product.findFirst({ where: { sku: 'DCDB-1IN-1OUT' } });
  const acdb = await prisma.product.findFirst({ where: { sku: 'ACDB-1PH' } });
  const earthing = await prisma.product.findFirst({ where: { sku: 'EARTH-ROD-2M' } });
  const la = await prisma.product.findFirst({ where: { sku: 'LIGHTNING-ARR' } });

  // Create Quote
  const quote = await prisma.quote.create({
    data: {
      companyId: company.id,
      customerId: customer.id,
      leadId: lead.id,
      packageTemplateId: pkg.id,
      createdById: sales.id,
      quoteNumber: `QT-${Date.now().toString().slice(-6)}`,
      status: 'ACCEPTED',
      capacityKw: 3.0,
      subtotal: 170000,
      discountAmount: 0,
      gstAmount: 23800,
      totalAmount: 193800,
      subsidyAmount: 78000,
      netPayable: 115800,
      lines: {
        create: [
          { productId: monoPanel.id, description: monoPanel.name, quantity: 6, unitPrice: 15000, lineTotal: 90000 },
          { productId: inverter.id, description: inverter.name, quantity: 1, unitPrice: 45000, lineTotal: 45000 },
          { productId: structure.id, description: structure.name, quantity: 3, unitPrice: 8000, lineTotal: 24000 },
          { productId: dcdb.id, description: dcdb.name, quantity: 1, unitPrice: 6500, lineTotal: 6500 },
          { productId: acdb.id, description: acdb.name, quantity: 1, unitPrice: 6500, lineTotal: 6500 },
          { productId: earthing.id, description: earthing.name, quantity: 2, unitPrice: 2500, lineTotal: 5000 },
          { productId: la.id, description: la.name, quantity: 1, unitPrice: 3000, lineTotal: 3000 },
        ],
      },
    },
  });

  // Create Sales Order
  const order = await prisma.salesOrder.create({
    data: {
      companyId: company.id,
      customerId: customer.id,
      quoteId: quote.id,
      createdById: sales.id,
      orderNumber: `SO-${Date.now().toString().slice(-6)}`,
      status: 'DELIVERED',
      capacityKw: 3.0,
      revenue: 193800,
      subtotal: 170000,
      gstAmount: 23800,
      totalAmount: 193800,
      confirmedAt: new Date(Date.now() - 86400000),
      dispatchedAt: new Date(Date.now() - 43200000),
      deliveredAt: new Date(Date.now() - 21600000),
      payments: {
        create: [
          {
            companyId: company.id,
            amount: 50000,
            method: 'UPI',
            status: 'COMPLETED',
            transactionRef: 'UPI-DEMO-ADV01',
            receivedAt: new Date(Date.now() - 86400000),
          },
        ],
      },
    },
  });

  // Create Serial Number for inverter (dispatched to site)
  const serial = await prisma.serialNumber.create({
    data: {
      companyId: company.id,
      productId: inverter.id,
      orderId: order.id,
      customerId: customer.id,
      serial: 'INV-3KW-998877',
      status: 'DISPATCHED',
      scannedAt: new Date(Date.now() - 43200000),
      deliveredAt: new Date(Date.now() - 21600000),
    },
  });

  // Create Installation Job
  const job = await prisma.installationJob.create({
    data: {
      companyId: company.id,
      orderId: order.id,
      customerId: customer.id,
      technicianId: tech.id,
      jobNumber: 'JOB-2026-0001',
      status: 'IN_PROGRESS',
      scheduledAt: new Date(),
      startTime: new Date(Date.now() - 3 * 3600000),
      confirmedKw: 3.0,
      standsInstalled: false,
      panelsInstalled: false,
      boxesInstalled: false,
      earthingCompleted: false,
      powerTestPassed: false,
      notes: 'On-site installation in progress. Physical equipment delivered to site.',
    },
  });

  console.log('Successfully created test installation job:', {
    jobId: job.id,
    jobNumber: job.jobNumber,
    customer: customer.name,
    orderNumber: order.orderNumber,
    technician: tech.name,
    inverterSerial: serial.serial,
  });

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
