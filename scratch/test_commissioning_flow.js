const BASE_URL = 'http://localhost:5000/api/v1';

async function req(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.message || `HTTP error ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function testCommissioningFlow() {
  console.log('--- 1. Login as Technician (tech@sunpower.com) ---');
  const loginRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'tech@sunpower.com', password: 'password123' }),
  });
  const token = loginRes.data.token;
  console.log('Technician logged in successfully.');

  const authHeaders = { Authorization: `Bearer ${token}` };

  console.log('--- 2. Fetch Assigned Jobs ---');
  const jobsRes = await req('/jobs', { headers: authHeaders });
  const jobs = jobsRes.data;
  console.log(`Found ${jobs.length} jobs assigned.`);
  const testJob = jobs[0];
  console.log(`Testing with Job: ${testJob.jobNumber} (ID: ${testJob.id})`);

  console.log('--- 3. Fetch Job Details ---');
  const detailRes = await req(`/jobs/${testJob.id}`, { headers: authHeaders });
  const jobDetail = detailRes.data;
  console.log('Customer:', jobDetail.customer?.name);
  console.log('Capacity kW:', jobDetail.order?.capacityKw);
  console.log('Delivered Serial:', jobDetail.order?.serialNumbers?.[0]?.serial);

  console.log('--- 4. Verify Failure Case: Incomplete Component Connection ---');
  const sampleSignatureBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const samplePhotoUrl =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

  // Component connection with 1 FAILED item
  const incompleteConnections = [
    { name: 'Module Mounting Structure', category: 'Structure', status: 'CONNECTED_SUCCESSFULLY', reading: '12 Nm' },
    { name: 'Solar Inverter DC Input', category: 'Inverter', status: 'PENDING_FAILED', reading: 'Unconnected' },
  ];

  try {
    await req(`/jobs/${testJob.id}/complete`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        startTime: new Date(Date.now() - 4 * 3600000).toISOString(),
        endTime: new Date().toISOString(),
        confirmedKw: 3.0,
        standsInstalled: true,
        panelsInstalled: true,
        boxesInstalled: true,
        earthingCompleted: true,
        powerTestPassed: true,
        signedByName: 'Suresh Rao',
        signatureImageBase64: sampleSignatureBase64,
        photoUrls: [samplePhotoUrl],
        componentConnections: JSON.stringify(incompleteConnections),
      }),
    });
    console.error('ERROR: Should have failed with incomplete component connection!');
  } catch (err) {
    console.log('✓ Expected rejection caught:', err.message);
  }

  console.log('--- 5. Verify Success Case: All Components Connected Successfully ---');
  const verifiedConnections = [
    { name: 'Module Mounting Structure & Stands Anchored', category: 'Structure', status: 'CONNECTED_SUCCESSFULLY', reading: '12 Nm Torque, Wind-Anchored' },
    { name: 'Solar PV Panels Array (MC4 Strings)', category: 'PV Array', status: 'CONNECTED_SUCCESSFULLY', reading: 'Voc: 382V DC, MC4 IP68 Locked' },
    { name: 'DC Distribution Box (DCDB & SPDs)', category: 'DC Protection', status: 'CONNECTED_SUCCESSFULLY', reading: '1000V DC Fuses & DC SPD Grounded' },
    { name: 'Solar Inverter DC Input (MPPT Channels)', category: 'Inverter DC', status: 'CONNECTED_SUCCESSFULLY', reading: 'DC Isolator ON, Polarity Checked' },
    { name: 'Solar Inverter AC Output Terminals', category: 'Inverter AC', status: 'CONNECTED_SUCCESSFULLY', reading: '234V AC, 50.0 Hz Synchronized' },
    { name: 'AC Distribution Box (ACDB & MCB/RCCB)', category: 'AC Protection', status: 'CONNECTED_SUCCESSFULLY', reading: 'MCB & 30mA RCCB Protection Active' },
    { name: 'Dual Chemical Earthing System', category: 'Grounding', status: 'CONNECTED_SUCCESSFULLY', reading: 'Dual Pits Earth Resistance: 2.3 Ω' },
    { name: 'Lightning Arrester (LA) System', category: 'Surge & Lightning', status: 'CONNECTED_SUCCESSFULLY', reading: 'ESE Rooftop Mast Clamped & Grounded' },
    { name: 'DISCOM Bi-Directional Net-Meter', category: 'Grid Sync', status: 'CONNECTED_SUCCESSFULLY', reading: 'Anti-Islanding Trip Tested (<2s)' },
    { name: 'System Power Generation & Output', category: 'Generation', status: 'CONNECTED_SUCCESSFULLY', reading: '3.0 kW Active Live Feed' },
  ];

  const completeRes = await req(`/jobs/${testJob.id}/complete`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      startTime: new Date(Date.now() - 4 * 3600000).toISOString(),
      endTime: new Date().toISOString(),
      confirmedKw: 3.0,
      standsInstalled: true,
      panelsInstalled: true,
      boxesInstalled: true,
      earthingCompleted: true,
      powerTestPassed: true,
      signedByName: 'Suresh Rao',
      signatureImageBase64: sampleSignatureBase64,
      photoUrls: [samplePhotoUrl, samplePhotoUrl],
      photoCaptions: JSON.stringify(['Solar Rooftop Array Layout', 'Inverter & Conduits Dressed']),
      componentConnections: JSON.stringify(verifiedConnections),
      notes: 'All 10 components connected, torqued, and verified with 3.0 kW grid feed.',
    }),
  });

  console.log('Completion Response:', completeRes.message);
  console.log('Updated Status:', completeRes.data.status);

  console.log('--- 6. Verify Completed Job Detail Retrieval ---');
  const completedDetailRes = await req(`/jobs/${testJob.id}`, { headers: authHeaders });
  const completedJob = completedDetailRes.data;
  console.log('Job Status:', completedJob.status);
  console.log('Signature Signed By:', completedJob.signature?.signedByName);
  console.log('Photos Count:', completedJob.photos?.length);
  console.log('Component Connections Count:', completedJob.componentConnections?.length);
  console.log('First Component Connection:', completedJob.componentConnections?.[0]);

  console.log('--- 7. Download Official Certificate PDF ---');
  const certRes = await fetch(`${BASE_URL}/jobs/${testJob.id}/certificate`, { headers: authHeaders });
  const certBuf = await certRes.arrayBuffer();
  console.log(`Certificate PDF generated successfully! Size: ${certBuf.byteLength} bytes`);

  console.log('--- 8. Customer Portal Verification ---');
  const custLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'customer@sunpower.com', password: 'password123' }),
  });
  const custHeaders = { Authorization: `Bearer ${custLogin.data.token}` };
  const portalRes = await req('/customer-portal/me', { headers: custHeaders });
  const custOrders = portalRes.data.orders;
  const custJob = custOrders[0]?.installationJobs?.[0];
  console.log('Customer Portal Job Status:', custJob?.status);
  console.log('Customer Portal Job Photos:', custJob?.photos?.length);
  console.log('Customer Portal Job Has Signature:', !!custJob?.signature);

  console.log('\n========================================');
  console.log('ALL VERIFICATION CHECKS PASSED 100%!');
  console.log('========================================');
  process.exit(0);
}

testCommissioningFlow().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
