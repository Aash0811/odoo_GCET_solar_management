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

async function runVerification() {
  console.log('--- Starting Multi-Zone & Strict Admin Authority Verification ---');

  // Find company
  let company = await prisma.company.findFirst();

  // Find ADMIN user
  let admin = await prisma.user.findFirst({
    where: { companyId: company.id, role: 'ADMIN', isActive: true }
  });

  // Find WAREHOUSE user
  let warehouseUser = await prisma.user.findFirst({
    where: { companyId: company.id, role: 'WAREHOUSE', isActive: true }
  });

  const adminToken = jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role, companyId: company.id },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const whToken = jwt.sign(
    { sub: warehouseUser.id, email: warehouseUser.email, role: warehouseUser.role, companyId: company.id },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log(`[Setup] Company: ${company.name}, Admin: ${admin.email}, WH User: ${warehouseUser.email}`);

  // Test 1: Admin can fetch managers
  console.log('\n[Test 1] GET /api/v1/warehouses/managers as ADMIN');
  const mgrRes = await request('/warehouses/managers', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log(`Status: ${mgrRes.status}, Found ${mgrRes.data?.data?.length} managers`);
  if (mgrRes.status !== 200 || !Array.isArray(mgrRes.data?.data)) {
    throw new Error('Test 1 failed: Admin could not fetch managers.');
  }

  // Test 2: Non-admin WAREHOUSE user CANNOT fetch managers (Strict Admin Only)
  console.log('\n[Test 2] GET /api/v1/warehouses/managers as WAREHOUSE (Expected 403)');
  const mgrResNonAdmin = await request('/warehouses/managers', {
    method: 'GET',
    headers: { Authorization: `Bearer ${whToken}` }
  });
  console.log(`Status: ${mgrResNonAdmin.status}`);
  if (mgrResNonAdmin.status === 403) {
    console.log('Passed: Got 403 Forbidden as expected for non-admin.');
  } else {
    throw new Error(`Test 2 failed: Expected 403 but got ${mgrResNonAdmin.status}`);
  }

  // Test 3: Admin creates Multi-Zone setup for "Bangalore" with 3 distinct zones and physical addresses
  const testCity = `Bangalore-${Date.now().toString().slice(-4)}`;
  console.log(`\n[Test 3] POST /api/v1/warehouses/batch as ADMIN for city '${testCity}'`);
  const batchPayload = {
    city: testCity,
    zones: [
      {
        zone: 'Zone 1',
        name: `${testCity} North Hub`,
        address: 'Plot 14, Peenya 2nd Phase Industrial Area, Bangalore 560058',
        phone: '+91 98450 11111',
        managerId: warehouseUser.id
      },
      {
        zone: 'Zone 2',
        name: `${testCity} South Hub`,
        address: 'Survey 88, Electronic City Phase 1, Hosur Road, Bangalore 560100',
        phone: '+91 98450 22222',
        managerId: admin.id
      },
      {
        zone: 'Zone 3',
        name: `${testCity} East Hub`,
        address: 'Plot 5, ITPL Main Road, Whitefield, Bangalore 560066',
        phone: '+91 98450 33333'
      }
    ]
  };

  const batchRes = await request('/warehouses/batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(batchPayload)
  });

  console.log(`Status: ${batchRes.status}, Created: ${batchRes.data?.data?.length} warehouses`);
  if (batchRes.status !== 201 || batchRes.data?.data?.length !== 3) {
    throw new Error(`Test 3 failed: Batch creation returned status ${batchRes.status}, data: ${JSON.stringify(batchRes.data)}`);
  }

  const createdWhs = batchRes.data.data;
  const z1 = createdWhs.find(w => w.zone === 'Zone 1');
  const z2 = createdWhs.find(w => w.zone === 'Zone 2');
  const z3 = createdWhs.find(w => w.zone === 'Zone 3');

  console.log(`- Zone 1: ${z1.name} | Address: ${z1.address} | Manager: ${z1.manager?.name}`);
  console.log(`- Zone 2: ${z2.name} | Address: ${z2.address} | Manager: ${z2.manager?.name}`);
  console.log(`- Zone 3: ${z3.name} | Address: ${z3.address} | Manager: ${z3.manager?.name || 'None'}`);

  if (z1.address === z2.address || z2.address === z3.address) {
    throw new Error('Test 3 failed: Addresses should be different for each zone.');
  }

  // Test 4: Non-admin CANNOT create warehouse or multi-zone batch
  console.log('\n[Test 4] POST /api/v1/warehouses/batch as WAREHOUSE (Expected 403)');
  const batchResNonAdmin = await request('/warehouses/batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${whToken}` },
    body: JSON.stringify(batchPayload)
  });
  console.log(`Status: ${batchResNonAdmin.status}`);
  if (batchResNonAdmin.status === 403) {
    console.log('Passed: Got 403 Forbidden as expected for non-admin on batch create.');
  } else {
    throw new Error(`Test 4 failed: Expected 403 but got ${batchResNonAdmin.status}`);
  }

  // Test 5: Non-admin CANNOT update warehouse or change warehouse manager
  console.log('\n[Test 5] PATCH /api/v1/warehouses/:id as WAREHOUSE (Expected 403)');
  const patchResNonAdmin = await request(`/warehouses/${z1.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${whToken}` },
    body: JSON.stringify({ managerId: admin.id })
  });
  console.log(`Status: ${patchResNonAdmin.status}`);
  if (patchResNonAdmin.status === 403) {
    console.log('Passed: Got 403 Forbidden as expected for non-admin on update/reassign manager.');
  } else {
    throw new Error(`Test 5 failed: Expected 403 but got ${patchResNonAdmin.status}`);
  }

  // Test 6: Admin CAN update warehouse address and reassign warehouse manager
  console.log('\n[Test 6] PATCH /api/v1/warehouses/:id as ADMIN');
  const updateRes = await request(`/warehouses/${z3.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      address: 'Plot 5A, EPIP Zone, Whitefield Export Corridor, Bangalore 560066',
      managerId: warehouseUser.id
    })
  });
  console.log(`Status: ${updateRes.status}, Updated address: ${updateRes.data?.data?.address}, Manager: ${updateRes.data?.data?.manager?.name}`);
  if (updateRes.data?.data?.managerId !== warehouseUser.id) {
    throw new Error('Test 6 failed: Manager was not reassigned.');
  }

  // Test 7: Non-admin CAN still list warehouses
  console.log('\n[Test 7] GET /api/v1/warehouses as WAREHOUSE (Expected 200)');
  const listRes = await request('/warehouses', {
    method: 'GET',
    headers: { Authorization: `Bearer ${whToken}` }
  });
  console.log(`Status: ${listRes.status}, Warehouses visible to staff: ${listRes.data?.data?.length}`);
  if (listRes.status !== 200) {
    throw new Error('Test 7 failed: Staff could not view warehouses.');
  }

  // Cleanup created test warehouses
  console.log('\n[Cleanup] Deleting test warehouses as ADMIN');
  for (const wh of createdWhs) {
    await request(`/warehouses/${wh.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
  }
  console.log('Cleaned up test warehouses successfully.');

  console.log('\n>>> ALL 7 MULTI-ZONE & ADMIN AUTHORITY TESTS PASSED SUCCESSFULLY! <<<');
}

runVerification()
  .catch((err) => {
    console.error('\n❌ Verification Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
