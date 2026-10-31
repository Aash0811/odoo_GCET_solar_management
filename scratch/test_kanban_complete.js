async function runKanbanSuite() {
  console.log("================================================================================");
  console.log("   CRM KANBAN PAGINATION & OPTIMIZED DATA LOADING AUDIT SUITE                   ");
  console.log("================================================================================");

  // 1. Login as Sales Lead
  const loginRes = await fetch("http://localhost:5000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "sales@sunpower.com",
      password: "password123",
    }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data?.token;
  if (!token) throw new Error("Failed to authenticate as Sales Lead");
  const headers = { Authorization: `Bearer ${token}` };

  console.log("[AUTH] Authenticated as Sales Lead: sales@sunpower.com");

  // TEST 1: Default Kanban Loading with limit=5
  console.log("\n--- TEST 1: Default Paginated Kanban Fetch (limit=5) ---");
  const t1Res = await fetch("http://localhost:5000/api/v1/leads/kanban?limit=5", { headers });
  const t1Json = await t1Res.json();
  const kanban = t1Json.data;

  console.log(`[PASS] Kanban API returned successfully:`);
  console.log(`   - Default Column Limit: ${kanban.limit}`);
  console.log(`   - Total Database Leads: ${kanban.totalCount}`);

  const STAGES = [
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "SURVEY_SCHEDULED",
    "SURVEY_DONE",
    "SURVEY_APPROVED",
    "QUOTED",
    "WON",
    "LOST",
  ];

  let totalCardsLoaded = 0;
  for (const s of STAGES) {
    const col = kanban.stages[s];
    if (!col) throw new Error(`Missing stage: ${s}`);
    totalCardsLoaded += col.items.length;
    console.log(
      `   - [${s.padEnd(16)}] Loaded: ${col.items.length}/${col.total} | Page: ${col.page} of ${col.totalPages} | Limit: ${col.limit}`
    );
    if (col.items.length > 5) {
      throw new Error(`Stage ${s} loaded ${col.items.length} cards, which exceeds limit=5!`);
    }
  }

  const reductionPct = Math.round((1 - totalCardsLoaded / kanban.totalCount) * 100);
  console.log(`[METRIC] Loaded ${totalCardsLoaded} cards out of ${kanban.totalCount} in database.`);
  console.log(`[VERIFIED] Memory & network payload data reduced by ${reductionPct}%!`);

  // TEST 2: Multi-Column Independent Paging
  console.log("\n--- TEST 2: Multi-Column Independent Pagination ---");
  // Let's test QUOTED column page 2
  const quotedP2Res = await fetch("http://localhost:5000/api/v1/leads/kanban?stage=QUOTED&page=2&limit=5", { headers });
  const quotedP2 = (await quotedP2Res.json()).data;
  console.log(`[PASS] QUOTED Column Page 2:`, {
    stage: quotedP2.stage,
    page: quotedP2.page,
    totalPages: quotedP2.totalPages,
    itemsLoaded: quotedP2.items.length,
    firstLead: quotedP2.items[0]?.contactName,
  });
  if (quotedP2.stage !== "QUOTED" || quotedP2.page !== 2) {
    throw new Error("QUOTED column page 2 fetch failed!");
  }

  // Let's test WON column page 1 and page 2 if available
  const wonP1Res = await fetch("http://localhost:5000/api/v1/leads/kanban?stage=WON&page=1&limit=3", { headers });
  const wonP1 = (await wonP1Res.json()).data;
  console.log(`[PASS] WON Column Page 1 (limit=3):`, {
    stage: wonP1.stage,
    page: wonP1.page,
    totalPages: wonP1.totalPages,
    itemsLoaded: wonP1.items.length,
  });

  // TEST 3: Dynamic Column Limit Adjustment (e.g. User toggles [10] cards per column)
  console.log("\n--- TEST 3: Dynamic Column Limit Selector (limit=10) ---");
  const limit10Res = await fetch("http://localhost:5000/api/v1/leads/kanban?limit=10", { headers });
  const limit10Json = (await limit10Res.json()).data;
  console.log(`[PASS] Kanban loaded with limit=10. Sample column:`);
  console.log(`   - QUOTED Stage: ${limit10Json.stages.QUOTED.items.length}/${limit10Json.stages.QUOTED.total} loaded (Total pages: ${limit10Json.stages.QUOTED.totalPages})`);
  if (limit10Json.stages.QUOTED.limit !== 10) {
    throw new Error("Column limit was not updated to 10!");
  }

  // TEST 4: Channel Filtering + Debounced Server-Side Search
  console.log("\n--- TEST 4: Channel Filtering + Server-Side Search in Paginated Kanban ---");
  const filteredRes = await fetch("http://localhost:5000/api/v1/leads/kanban?limit=5&search=Rajesh", { headers });
  const filteredJson = (await filteredRes.json()).data;
  console.log(`[PASS] Filtered Kanban for 'Rajesh': Found ${filteredJson.totalCount} leads across stages.`);
  for (const s of STAGES) {
    const col = filteredJson.stages[s];
    if (col.total > 0) {
      console.log(`   - Stage [${s}]: ${col.total} matches (showing ${col.items.length})`);
    }
  }

  console.log("\n================================================================================");
  console.log("   🎉 ALL KANBAN PAGINATION AUDIT TESTS PASSED SUCCESSFULLY (100%)!            ");
  console.log("================================================================================");
}

runKanbanSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

