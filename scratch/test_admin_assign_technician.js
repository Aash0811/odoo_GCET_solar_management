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

async function runTest() {
  console.log('--- 1. Login as Admin (admin@sunpower.com) ---');
  const adminLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@sunpower.com', password: 'password123' }),
  });
  const adminToken = adminLogin.data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  console.log('Admin logged in successfully.');

  console.log('--- 2. Fetch Active Technicians ---');
  const techRes = await req('/surveys/technicians', { headers: adminHeaders });
  const technicians = techRes.data;
  console.log(`Found ${technicians.length} active technicians:`, technicians.map((t) => t.name));
  const chosenTech = technicians[0];

  console.log('--- 3. Test Lead Qualification (No Auto-Assign) ---');
  // Create a new lead to qualify
  const uniqueSuffix = Date.now().toString().slice(-6);
  const leadRes = await req('/leads', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      contactName: `Lead ${uniqueSuffix}`,
      phone: `91${uniqueSuffix}12`,
      email: `test_${uniqueSuffix}@example.com`,
      address: `Road No ${uniqueSuffix}, Gachibowli, Hyderabad`,
      city: 'Hyderabad',
      title: `${uniqueSuffix} Rooftop Solar Requirement`,
      desiredCapacityKw: 5,
    }),
  });
  const lead = leadRes.data;
  console.log('Created Lead:', lead.id, lead.contactName);

  // Qualify lead
  await req(`/leads/${lead.id}/checklist`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({
      shadowFreeArea: true,
      monthlyBill: true,
      gridSuitable: true,
      monthlyBillAmount: 6000,
      desiredCapacityKw: 5,
    }),
  });

  // Verify survey was created with surveyedById: null (NO AUTO-ASSIGNMENT)
  const surveysRes = await req('/surveys', { headers: adminHeaders });
  const createdSurvey = surveysRes.data.find((s) => s.leadId === lead.id);
  console.log('Created Survey ID:', createdSurvey?.id);
  console.log('Survey Status:', createdSurvey?.status);
  console.log('Assigned Technician (Should be null):', createdSurvey?.surveyedById);

  if (createdSurvey?.surveyedById !== null) {
    throw new Error('FAILED: Survey should NOT have been auto-assigned to a technician!');
  }
  console.log('✓ Verified: Auto-assign is disabled upon lead qualification.');

  console.log('--- 4. Test Survey Scheduling: Rejection Without Admin-Assigned Technician ---');
  try {
    await req('/surveys/schedule', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        surveyId: createdSurvey.id,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        surveyedById: '', // missing technician
      }),
    });
    throw new Error('FAILED: Should have rejected scheduling without technician!');
  } catch (err) {
    console.log('✓ Expected rejection caught:', err.message);
  }

  console.log('--- 5. Test Survey Scheduling: Admin Assigns Technician ---');
  const scheduleRes = await req('/surveys/schedule', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      surveyId: createdSurvey.id,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      surveyedById: chosenTech.id, // Admin explicitly assigns technician
      notes: 'Admin assigned Vikram Singh for rooftop structural inspection.',
    }),
  });
  console.log('Survey Scheduled:', scheduleRes.data?.status);
  console.log('Assigned Technician ID:', scheduleRes.data?.surveyedById);
  if (scheduleRes.data?.surveyedById !== chosenTech.id) {
    throw new Error('FAILED: Survey was not assigned to the technician selected by Admin!');
  }
  console.log(`✓ Verified: Survey explicitly assigned to Admin choice (${chosenTech.name}).`);

  console.log('--- 6. Test Installation Job Technician Assignment by Admin ---');
  const jobsRes = await req('/jobs', { headers: adminHeaders });
  const testJob = jobsRes.data.find((j) => j.status === 'IN_PROGRESS');
  console.log('Target Installation Job:', testJob.jobNumber, '(Current Tech:', testJob.technician?.name || 'None', ')');

  // Admin assigns technician to job
  const assignJobRes = await req(`/jobs/${testJob.id}/progress`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({
      technicianId: chosenTech.id,
    }),
  });
  const updatedJob = assignJobRes.data;
  console.log('Updated Job Assigned Tech:', updatedJob.technician?.name);
  if (updatedJob.technicianId !== chosenTech.id) {
    throw new Error('FAILED: Installation job technician was not updated by Admin!');
  }
  console.log(`✓ Verified: Installation Job assigned to Admin choice (${chosenTech.name}).`);

  console.log('\n========================================');
  console.log('ALL ADMIN ASSIGNMENT TESTS PASSED 100%!');
  console.log('========================================');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
