const jwt = require('jsonwebtoken');
const prisma = require('../src/config/prisma');
const env = require('../src/config/env');

const API_BASE = 'http://localhost:5000/api/v1';

// 1x1 transparent PNG as base64
const DUMMY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function runPhotoVerification() {
  console.log('=== VERIFYING ROOFTOP PHOTO (CUSTOMER) & SOLAR INSTALLATION PHOTO (TECHNICIAN) ===\n');

  try {
    const company = await prisma.company.findFirst();
    if (!company) throw new Error('No company found');

    // -------------------------------------------------------------
    // PART 1: CUSTOMER ROOFTOP PHOTO UPLOAD
    // -------------------------------------------------------------
    console.log('[Test 1] Testing Customer Rooftop Photo Upload...');
    
    // Find or create customer
    let customer = await prisma.customer.findFirst({ where: { companyId: company.id } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          companyId: company.id,
          name: 'Rooftop Test Owner',
          email: 'rooftop.test@example.com',
          phone: '9876543210',
          city: 'Hyderabad',
        },
      });
    }

    let customerUser = await prisma.user.findFirst({
      where: { companyId: company.id, role: 'CUSTOMER' },
    });
    if (!customerUser) {
      customerUser = await prisma.user.create({
        data: {
          companyId: company.id,
          name: customer.name,
          email: customer.email || 'customer.test@example.com',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
          role: 'CUSTOMER',
        },
      });
    }

    // Find or create quote
    let quote = await prisma.quote.findFirst({
      where: { companyId: company.id },
      include: { photos: true },
    });

    if (!quote) {
      // Find package template & lead & user to create quote
      let pkg = await prisma.packageTemplate.findFirst({ where: { companyId: company.id } });
      let lead = await prisma.lead.findFirst({ where: { companyId: company.id } });
      let admin = await prisma.user.findFirst({ where: { companyId: company.id, role: 'ADMIN' } });

      quote = await prisma.quote.create({
        data: {
          companyId: company.id,
          customerId: customer.id,
          leadId: lead ? lead.id : (await prisma.lead.create({
            data: { companyId: company.id, title: 'Test Lead', contactName: 'Lead Tester', phone: '9876543210' },
          })).id,
          packageTemplateId: pkg.id,
          createdById: admin.id,
          quoteNumber: `QT-TEST-${Date.now().toString().slice(-5)}`,
          capacityKw: 3.0,
          subtotal: 150000,
          totalAmount: 177000,
          status: 'SENT',
        },
        include: { photos: true },
      });
    }

    console.log(`Using Quote ${quote.quoteNumber} (ID: ${quote.id}) for Customer`);

    const customerToken = jwt.sign(
      { sub: customerUser.id, role: 'CUSTOMER', companyId: company.id },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const dummyImgBuf = Buffer.from(DUMMY_PNG_BASE64, 'base64');
    const customerFormData = new FormData();
    const customerBlob = new Blob([dummyImgBuf], { type: 'image/png' });
    customerFormData.append('photos', customerBlob, 'rooftop_south_angle.png');
    customerFormData.append('caption', 'South-facing unobstructed RCC roof test');
    customerFormData.append('phase', 'ROOF_CONDITION');

    const customerRes = await fetch(`${API_BASE}/quotes/${quote.id}/photos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
      },
      body: customerFormData,
    });

    console.log(`Customer quote photo upload HTTP status: ${customerRes.status}`);
    const customerJson = await customerRes.json();
    if (!customerRes.ok) {
      throw new Error(`Customer upload failed: ${JSON.stringify(customerJson)}`);
    }

    const quotePhotosInDb = await prisma.quotePhoto.findMany({
      where: { quoteId: quote.id },
    });
    console.log(`Verified in DB: Quote has ${quotePhotosInDb.length} photos attached.`);
    if (quotePhotosInDb.length === 0) {
      throw new Error('QuotePhoto record was not saved to DB!');
    }
    console.log('✅ TEST 1 PASSED: Customer can upload rooftop photos!\n');

    // -------------------------------------------------------------
    // PART 2: TECHNICIAN INSTALLATION PHOTO UPLOAD
    // -------------------------------------------------------------
    console.log('[Test 2] Testing Technician Installation Photo Upload...');

    let technician = await prisma.user.findFirst({
      where: { companyId: company.id, role: 'TECHNICIAN' },
    });
    if (!technician) {
      technician = await prisma.user.create({
        data: {
          companyId: company.id,
          name: 'Master Field Technician',
          email: 'technician@sunpower.com',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
          role: 'TECHNICIAN',
        },
      });
    }

    const technicianToken = jwt.sign(
      { sub: technician.id, role: 'TECHNICIAN', companyId: company.id },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Find or create an installation job
    let job = await prisma.installationJob.findFirst({
      where: { companyId: company.id, status: { not: 'COMPLETED' } },
    });

    if (!job) {
      let order = await prisma.salesOrder.findFirst({ where: { companyId: company.id } });
      job = await prisma.installationJob.create({
        data: {
          companyId: company.id,
          orderId: order.id,
          customerId: customer.id,
          technicianId: technician.id,
          jobNumber: `JOB-TEST-${Date.now().toString().slice(-5)}`,
          status: 'IN_PROGRESS',
        },
      });
    }

    console.log(`Using Job ${job.jobNumber} (ID: ${job.id}) for Technician`);

    // 2A: Standalone photo upload
    const techFormData = new FormData();
    const techBlob = new Blob([dummyImgBuf], { type: 'image/png' });
    techFormData.append('photos', techBlob, 'installed_inverter_wiring.png');
    techFormData.append('caption', 'Inverter DC isolator & earthing terminal');
    techFormData.append('phase', 'DURING');

    const techRes = await fetch(`${API_BASE}/jobs/${job.id}/photos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${technicianToken}`,
      },
      body: techFormData,
    });

    console.log(`Technician job photo upload HTTP status: ${techRes.status}`);
    const techJson = await techRes.json();
    if (!techRes.ok) {
      throw new Error(`Technician photo upload failed: ${JSON.stringify(techJson)}`);
    }

    const jobPhotosInDb = await prisma.jobPhoto.findMany({
      where: { installationJobId: job.id },
    });
    console.log(`Verified in DB: Job has ${jobPhotosInDb.length} photos attached.`);
    if (jobPhotosInDb.length === 0) {
      throw new Error('JobPhoto record was not saved to DB!');
    }
    console.log('✅ TEST 2 PASSED: Technician can upload standalone installation photos!\n');

    // -------------------------------------------------------------
    // PART 3: TECHNICIAN JOB COMPLETION WITH MULTIPART PHOTO & CHECKLIST
    // -------------------------------------------------------------
    console.log('[Test 3] Testing Technician Job Completion with Multipart Photo & Mandatory Checklist...');

    const completeFormData = new FormData();
    const compPhotoBlob = new Blob([dummyImgBuf], { type: 'image/png' });
    completeFormData.append('photos', compPhotoBlob, 'completed_solar_array_final.png');
    completeFormData.append('standsInstalled', 'true');
    completeFormData.append('panelsInstalled', 'true');
    completeFormData.append('boxesInstalled', 'true');
    completeFormData.append('earthingCompleted', 'true');
    completeFormData.append('powerTestPassed', 'true');
    completeFormData.append('confirmedKw', '3.2');
    completeFormData.append('startTime', new Date(Date.now() - 3 * 3600000).toISOString());
    completeFormData.append('endTime', new Date().toISOString());
    completeFormData.append('notes', 'All 8 Mono-PERC panels torqued to spec, inverter sync verified at 230V 50Hz');
    completeFormData.append('signatureImage', `data:image/png;base64,${DUMMY_PNG_BASE64}`);
    completeFormData.append('signatureImageBase64', `data:image/png;base64,${DUMMY_PNG_BASE64}`);
    completeFormData.append('signedByName', 'Rooftop Customer Signee');

    const completeRes = await fetch(`${API_BASE}/jobs/${job.id}/complete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${technicianToken}`,
      },
      body: completeFormData,
    });

    console.log(`Job completion HTTP status: ${completeRes.status}`);
    const completeJson = await completeRes.json();
    if (!completeRes.ok) {
      throw new Error(`Job completion failed: ${JSON.stringify(completeJson)}`);
    }

    const updatedJob = await prisma.installationJob.findUnique({
      where: { id: job.id },
      include: { photos: true, signature: true },
    });

    console.log(`Updated Job Status: ${updatedJob.status}`);
    console.log(`Checklist: stands=${updatedJob.standsInstalled}, panels=${updatedJob.panelsInstalled}, boxes=${updatedJob.boxesInstalled}, earthing=${updatedJob.earthingCompleted}, powerTest=${updatedJob.powerTestPassed}`);
    console.log(`Total Photos: ${updatedJob.photos.length}`);
    console.log(`Signature captured: ${!!updatedJob.signature}`);

    if (updatedJob.status !== 'COMPLETED') {
      throw new Error(`Job was not marked as COMPLETED! Found: ${updatedJob.status}`);
    }
    if (!updatedJob.powerTestPassed || !updatedJob.standsInstalled) {
      throw new Error('Checklist booleans were not properly saved!');
    }

    console.log('\n✅ TEST 3 PASSED: Technician can complete job with photos and mandatory checklist!');

    console.log('\n======================================================');
    console.log('🎉 ALL PHOTO UPLOAD & INSTALLATION VERIFICATION TESTS PASSED!');
    console.log('======================================================\n');
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhotoVerification();
