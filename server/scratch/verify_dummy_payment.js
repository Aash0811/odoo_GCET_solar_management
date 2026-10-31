const jwt = require('jsonwebtoken');
const prisma = require('../src/config/prisma');
const env = require('../src/config/env');

const API_BASE = 'http://localhost:5000/api/v1';

async function runVerification() {
  console.log('=== VERIFYING DUMMY PAYMENT METHOD FOR SALESMAN & CUSTOMER ===\n');

  try {
    const company = await prisma.company.findFirst();
    if (!company) throw new Error('No company found');

    // 1. Get or create a Salesman
    let salesman = await prisma.user.findFirst({
      where: { role: 'SALESMAN', companyId: company.id }
    });
    if (!salesman) {
      salesman = await prisma.user.create({
        data: {
          name: 'Demo Salesman',
          email: 'salesman@sunpower.com',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
          role: 'SALESMAN',
          companyId: company.id
        }
      });
    }

    // 2. Get or create a Customer User & Customer record
    let customerRecord = await prisma.customer.findFirst({
      where: { companyId: company.id }
    });
    if (!customerRecord) {
      customerRecord = await prisma.customer.create({
        data: {
          name: 'Demo Homeowner',
          email: 'homeowner@gmail.com',
          phone: '+91 99887 76655',
          companyId: company.id
        }
      });
    }

    let customerUser = await prisma.user.findFirst({
      where: { role: 'CUSTOMER', companyId: company.id }
    });
    if (!customerUser) {
      customerUser = await prisma.user.create({
        data: {
          name: customerRecord.name,
          email: customerRecord.email || 'customer@sunpower.com',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
          role: 'CUSTOMER',
          companyId: company.id
        }
      });
    }

    // 3. Find or create an Order to test payments on
    let testOrder = await prisma.salesOrder.findFirst({
      where: { companyId: company.id },
      include: { customer: true, payments: true }
    });

    if (!testOrder) {
      throw new Error('No sales order found to test payments on.');
    }

    console.log(`Using Test Order: ${testOrder.orderNumber} (Total: ₹${testOrder.totalAmount})`);

    // --- TEST 1: Salesman Records a Dummy Payment ---
    console.log('\n[Test 1] Testing Salesman recording Dummy Payment...');
    const salesmanToken = jwt.sign(
      { sub: salesman.id, role: salesman.role, companyId: salesman.companyId },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const dummyRefSales = `DUMMY-SALES-${Date.now().toString().slice(-6)}`;
    const salesPayPayload = {
      amount: 15000,
      method: 'DUMMY',
      transactionRef: dummyRefSales,
      notes: 'Salesman Demo Dummy Sandbox Payment',
    };

    const salesRes = await fetch(`${API_BASE}/orders/${testOrder.id}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${salesmanToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(salesPayPayload)
    });

    console.log(`Salesman payment response status: ${salesRes.status}`);
    const salesJson = await salesRes.json();
    if (!salesRes.ok) {
      throw new Error(`Salesman payment failed: ${JSON.stringify(salesJson)}`);
    }

    const recordedPaymentSales = salesJson.data?.payment;
    console.log(`Payment recorded by Salesman:`);
    console.log(` - ID: ${recordedPaymentSales.id}`);
    console.log(` - Amount: ₹${recordedPaymentSales.amount}`);
    console.log(` - Method: ${recordedPaymentSales.method}`);
    console.log(` - Ref: ${recordedPaymentSales.transactionRef}`);
    console.log(` - Receipt #: ${recordedPaymentSales.receiptNumber}`);

    if (recordedPaymentSales.method !== 'DUMMY') {
      throw new Error(`Expected method DUMMY, got ${recordedPaymentSales.method}`);
    }
    console.log('✓ Test 1 passed: Salesman successfully recorded dummy payment!');

    // --- TEST 2: Customer Makes a Dummy Payment ---
    console.log('\n[Test 2] Testing Customer recording Dummy Payment...');
    const customerToken = jwt.sign(
      { sub: customerUser.id, role: customerUser.role, companyId: customerUser.companyId },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const dummyRefCust = `DUMMY-CUST-${Date.now().toString().slice(-6)}`;
    const custPayPayload = {
      amount: 20000,
      method: 'DUMMY',
      transactionRef: dummyRefCust,
      notes: 'Customer Portal Instant Dummy Gateway Simulation',
    };

    const custRes = await fetch(`${API_BASE}/orders/${testOrder.id}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(custPayPayload)
    });

    console.log(`Customer payment response status: ${custRes.status}`);
    const custJson = await custRes.json();
    if (!custRes.ok) {
      throw new Error(`Customer payment failed: ${JSON.stringify(custJson)}`);
    }

    const recordedPaymentCust = custJson.data?.payment;
    console.log(`Payment recorded by Customer:`);
    console.log(` - ID: ${recordedPaymentCust.id}`);
    console.log(` - Amount: ₹${recordedPaymentCust.amount}`);
    console.log(` - Method: ${recordedPaymentCust.method}`);
    console.log(` - Ref: ${recordedPaymentCust.transactionRef}`);
    console.log(` - Receipt #: ${recordedPaymentCust.receiptNumber}`);

    if (recordedPaymentCust.method !== 'DUMMY') {
      throw new Error(`Expected method DUMMY, got ${recordedPaymentCust.method}`);
    }
    console.log('✓ Test 2 passed: Customer successfully made a dummy payment!');

    // --- TEST 3: Official PDF Receipt Download for Dummy Payment ---
    console.log('\n[Test 3] Testing PDF Receipt download for DUMMY payment...');
    const receiptRes = await fetch(`${API_BASE}/orders/${testOrder.id}/payments/${recordedPaymentCust.id}/receipt`, {
      headers: {
        Authorization: `Bearer ${customerToken}`,
      }
    });

    console.log(`Receipt download response status: ${receiptRes.status}`);
    if (!receiptRes.ok) {
      throw new Error(`Failed to download receipt: ${await receiptRes.text()}`);
    }
    const contentType = receiptRes.headers.get('content-type');
    console.log(`Content-Type: ${contentType}`);
    if (!contentType || !contentType.includes('application/pdf')) {
      throw new Error(`Expected application/pdf, got ${contentType}`);
    }
    const arrayBuf = await receiptRes.arrayBuffer();
    console.log(`PDF size: ${arrayBuf.byteLength} bytes`);
    console.log('✓ Test 3 passed: PDF Receipt with DUMMY method generated successfully!');

    console.log('\n======================================================');
    console.log('ALL DUMMY PAYMENT TESTS FOR SALESMAN & CUSTOMER PASSED!');
    console.log('======================================================');
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();

