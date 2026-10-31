const jwt = require('jsonwebtoken');
const prisma = require('../src/config/prisma');
const env = require('../src/config/env');

const API_BASE = 'http://localhost:5000/api/v1';

async function runVerification() {
  console.log('=== VERIFYING ACCOUNTANT ACCESS TO ADMIN DASHBOARD & P&L ===\n');

  try {
    // 1. Find or create an ACCOUNTANT user
    let accountant = await prisma.user.findFirst({
      where: { role: 'ACCOUNTANT' }
    });

    if (!accountant) {
      console.log('Creating a test accountant user...');
      const company = await prisma.company.findFirst();
      accountant = await prisma.user.create({
        data: {
          name: 'Chief Accountant',
          email: 'accountant@sunpowersolar.com',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
          role: 'ACCOUNTANT',
          companyId: company.id
        }
      });
    }

    console.log(`Accountant user found: ${accountant.name} (${accountant.email}), role=${accountant.role}`);

    // Generate JWT token for accountant using standard app config
    const token = jwt.sign(
      {
        sub: accountant.id,
        role: accountant.role,
        companyId: accountant.companyId,
      },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test 1: GET /dashboard/stats
    console.log('\n[Test 1] Testing GET /api/v1/dashboard/stats for ACCOUNTANT...');
    const statsRes = await fetch(`${API_BASE}/dashboard/stats?timeframe=all`, { headers });
    console.log(`Status: ${statsRes.status}`);
    if (!statsRes.ok) throw new Error(`HTTP ${statsRes.status}: ${await statsRes.text()}`);
    const statsJson = await statsRes.json();
    const data = statsJson.data;
    if (!data) throw new Error('No data returned from /dashboard/stats');

    const kpis = data.kpis;
    console.log('Returned KPIs:');
    console.log(` - totalRevenue: ₹${kpis.totalRevenue}`);
    console.log(` - totalCollections: ₹${kpis.totalCollections}`);
    console.log(` - totalOutstanding: ₹${kpis.totalOutstanding}`);
    console.log(` - totalNetProfit: ₹${kpis.totalNetProfit}`);
    console.log(` - overallGrossMargin: ${kpis.overallGrossMargin}%`);
    console.log(` - totalJobCosts: ₹${kpis.totalJobCosts}`);
    console.log(` - totalBOMCost: ₹${kpis.totalBOMCost}`);
    console.log(` - totalLaborCost: ₹${kpis.totalLaborCost}`);
    console.log(` - profitableJobsCount: ${kpis.profitableJobsCount}`);
    console.log(` - lossMakingJobsCount: ${kpis.lossMakingJobsCount}`);

    if (kpis.totalNetProfit === undefined || kpis.overallGrossMargin === undefined) {
      throw new Error('P&L KPIs (totalNetProfit, overallGrossMargin) are missing!');
    }
    console.log('✓ Test 1 passed: Accountant successfully received executive stats with P&L metrics.');

    // Test 2: Verify jobCostings array
    console.log('\n[Test 2] Verifying jobCostings P&L array...');
    const jobCostings = data.jobCostings;
    console.log(`Total orders in jobCostings ledger: ${jobCostings.length}`);
    if (jobCostings.length > 0) {
      const sample = jobCostings[0];
      console.log(` Sample order: ${sample.orderNumber} - ${sample.customerName}`);
      console.log(`  Revenue: ₹${sample.revenue}, BOM: ₹${sample.bomCost}, Labor: ₹${sample.technicianCost}, Profit: ₹${sample.profit} (${sample.profitMargin}%)`);
      console.log(`  Is Loss Making: ${sample.isLossMaking}`);
    }
    console.log('✓ Test 2 passed: Order P&L costing details returned correctly.');

    // Test 3: GET /dashboard/export-csv
    console.log('\n[Test 3] Testing GET /api/v1/dashboard/export-csv for ACCOUNTANT...');
    const csvRes = await fetch(`${API_BASE}/dashboard/export-csv`, { headers });
    console.log(`Status: ${csvRes.status}`);
    if (!csvRes.ok) throw new Error(`HTTP ${csvRes.status}: ${await csvRes.text()}`);
    const csvText = await csvRes.text();
    const csvPreview = csvText.substring(0, 150);
    console.log(`CSV Header preview:\n${csvPreview}...`);
    if (!csvText.includes('Revenue (INR)') || !csvText.includes('Profit (INR)')) {
      throw new Error('CSV output does not contain expected P&L columns');
    }
    console.log('✓ Test 3 passed: Accountant successfully exported P&L audit CSV.');

    // Test 4: POST /dashboard/share-link
    console.log('\n[Test 4] Testing POST /api/v1/dashboard/share-link for ACCOUNTANT...');
    const shareRes = await fetch(`${API_BASE}/dashboard/share-link`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ expiresInDays: 7 })
    });
    console.log(`Status: ${shareRes.status}`);
    if (!shareRes.ok) throw new Error(`HTTP ${shareRes.status}: ${await shareRes.text()}`);
    const shareJson = await shareRes.json();
    console.log(`shareUrl: ${shareJson.data?.shareUrl}`);
    console.log('✓ Test 4 passed: Accountant can generate expiring executive share links.');

    // Test 5: GET /finance/costing
    console.log('\n[Test 5] Testing GET /api/v1/finance/costing for ACCOUNTANT...');
    const costingRes = await fetch(`${API_BASE}/finance/costing`, { headers });
    console.log(`Status: ${costingRes.status}`);
    if (!costingRes.ok) throw new Error(`HTTP ${costingRes.status}: ${await costingRes.text()}`);
    const costingJson = await costingRes.json();
    console.log(`Costing entries: ${costingJson.data?.length || 0}`);
    console.log('✓ Test 5 passed: Accountant has full access to finance costing ledger.');

    // Test 6: GET /finance/invoices
    console.log('\n[Test 6] Testing GET /api/v1/finance/invoices for ACCOUNTANT...');
    const invoiceRes = await fetch(`${API_BASE}/finance/invoices`, { headers });
    console.log(`Status: ${invoiceRes.status}`);
    if (!invoiceRes.ok) throw new Error(`HTTP ${invoiceRes.status}: ${await invoiceRes.text()}`);
    const invoiceJson = await invoiceRes.json();
    console.log(`Invoices: ${invoiceJson.data?.length || 0}`);
    console.log('✓ Test 6 passed: Accountant has full access to finance tax invoices.');

    console.log('\n======================================================');
    console.log('ALL 6 ACCOUNTANT EXECUTIVE DASHBOARD & P&L TESTS PASSED!');
    console.log('======================================================');
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
