const prisma = require('../src/config/prisma');
const env = require('../src/config/env');
const jwt = require('jsonwebtoken');

const API_BASE = 'http://localhost:5000/api/v1';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {}
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('--- Starting Barcode System Verification ---');

  const company = await prisma.company.findFirst();
  const admin = await prisma.user.findFirst({
    where: { companyId: company.id, role: 'ADMIN', isActive: true }
  });

  const token = jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role, companyId: company.id },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Test 1: Fetch all item barcodes
  console.log('\n[Test 1] GET /api/v1/dispatch/item-barcodes');
  const itemsRes = await request('/dispatch/item-barcodes', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log(`Status: ${itemsRes.status}, Total items with unique barcodes: ${itemsRes.data?.data?.length}`);
  if (itemsRes.status !== 200 || !itemsRes.data?.data?.length) {
    throw new Error('Test 1 failed: Could not fetch item barcodes catalogue.');
  }

  const sample = itemsRes.data.data[0];
  console.log(`Sample Item: [${sample.masterBarcode}] ${sample.name}`);
  console.log(`  Tracking: ${sample.isSerialTracked ? 'Serialized' : 'Bulk'}`);
  console.log(`  Available Serials Count: ${sample.availableSerials?.length || 0}`);

  // Test 2: Lookup an individual unit serial barcode
  const trackedItemWithSerials = itemsRes.data.data.find(i => i.availableSerials?.length > 0);
  if (!trackedItemWithSerials) {
    throw new Error('No serialized items found in catalogue.');
  }

  const testSerial = trackedItemWithSerials.availableSerials[0];
  console.log(`\n[Test 2] GET /api/v1/dispatch/lookup-barcode for serial: '${testSerial}'`);
  const serialLookup = await request(`/dispatch/lookup-barcode?code=${encodeURIComponent(testSerial)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log(`Status: ${serialLookup.status}, Found: ${serialLookup.data?.data?.found}, Type: ${serialLookup.data?.data?.type}`);
  if (serialLookup.status !== 200 || !serialLookup.data?.data?.found || serialLookup.data?.data?.type !== 'SERIAL') {
    throw new Error('Test 2 failed: Could not lookup serial barcode.');
  }
  console.log(`  Product: ${serialLookup.data?.data?.product?.name}, Status: ${serialLookup.data?.data?.status}`);

  // Test 3: Lookup a master product barcode (SKU)
  const testSku = trackedItemWithSerials.sku;
  console.log(`\n[Test 3] GET /api/v1/dispatch/lookup-barcode for master SKU: '${testSku}'`);
  const skuLookup = await request(`/dispatch/lookup-barcode?code=${encodeURIComponent(testSku)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log(`Status: ${skuLookup.status}, Found: ${skuLookup.data?.data?.found}, Type: ${skuLookup.data?.data?.type}`);
  if (skuLookup.status !== 200 || !skuLookup.data?.data?.found || skuLookup.data?.data?.type !== 'PRODUCT_SKU') {
    throw new Error('Test 3 failed: Could not lookup master product barcode.');
  }
  console.log(`  Product: ${skuLookup.data?.data?.product?.name}, Warehouse locations: ${skuLookup.data?.data?.warehouseStocks?.length}`);

  // Test 4: Seed additional unique codes on demand
  console.log('\n[Test 4] POST /api/v1/dispatch/seed-unique-codes');
  const seedRes = await request('/dispatch/seed-unique-codes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ count: 2 })
  });

  console.log(`Status: ${seedRes.status}, Message: ${seedRes.data?.message}`);
  if (seedRes.status !== 200) {
    throw new Error('Test 4 failed: Seeding unique codes failed.');
  }

  console.log('\n>>> ALL 4 BARCODE SYSTEM TESTS PASSED SUCCESSFULLY! <<<');
}

run()
  .catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

