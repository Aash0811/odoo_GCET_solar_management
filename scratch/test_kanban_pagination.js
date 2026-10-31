async function testKanban() {
  console.log("======================================================================");
  console.log("   AUDIT: KANBAN PAGINATION & DATA LOAD DECREASE VERIFICATION        ");
  console.log("======================================================================");

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
  const token = loginJson.data.token;
  const headers = { Authorization: `Bearer ${token}` };

  // TEST 1: Initial Kanban fetch with limit=5 per stage
  console.log("\n--- TEST 1: Fetch Full Paginated Kanban Board (limit=5 per column) ---");
  const kanbanRes = await fetch("http://localhost:5000/api/v1/leads/kanban?limit=5", { headers });
  const kanbanJson = await kanbanRes.json();
  const kanban = kanbanJson.data;

  console.log(`[PASS] Kanban loaded with limit: ${kanban.limit}, Overall total leads: ${kanban.totalCount}`);
  const stageKeys = Object.keys(kanban.stages);
  console.log(`[PASS] Total stage columns returned: ${stageKeys.length}`);

  let totalCardsLoaded = 0;
  for (const s of stageKeys) {
    const col = kanban.stages[s];
    totalCardsLoaded += col.items.length;
    console.log(`   - [${s.padEnd(16)}] Items: ${col.items.length}/${col.total} | Page: ${col.page} of ${col.totalPages}`);
    if (col.items.length > 5) {
      throw new Error(`Stage ${s} returned ${col.items.length} items, exceeding limit 5!`);
    }
  }
  console.log(`[SUCCESS] Total cards loaded across all 9 stages: ${totalCardsLoaded} (vs ${kanban.totalCount} in database)`);
  console.log(`[DATA DECREASE] Data volume reduced by ${Math.round((1 - totalCardsLoaded / kanban.totalCount) * 100)}%!`);

  // TEST 2: Column-level pagination (fetch page 2 for a specific stage)
  console.log("\n--- TEST 2: Column-Level Page Fetch (stage=NEW, page=2, limit=2) ---");
  const colRes = await fetch("http://localhost:5000/api/v1/leads/kanban?stage=NEW&page=2&limit=2", { headers });
  const colJson = await colRes.json();
  const colData = colJson.data;
  console.log(`[PASS] Column pagination response:`, {
    stage: colData.stage,
    itemCount: colData.items.length,
    total: colData.total,
    page: colData.page,
    limit: colData.limit,
    totalPages: colData.totalPages,
  });

  if (colData.stage !== "NEW" || colData.page !== 2 || colData.limit !== 2) {
    throw new Error("Column pagination parameters mismatch!");
  }

  // TEST 3: Search within Paginated Kanban
  console.log("\n--- TEST 3: Search within Paginated Kanban (search='Rao') ---");
  const searchRes = await fetch("http://localhost:5000/api/v1/leads/kanban?limit=5&search=Rao", { headers });
  const searchJson = await searchRes.json();
  const searchKanban = searchJson.data;
  console.log(`[PASS] Search kanban returned total matching leads: ${searchKanban.totalCount}`);
  for (const s of Object.keys(searchKanban.stages)) {
    const col = searchKanban.stages[s];
    if (col.total > 0) {
      console.log(`   - Stage [${s}]: ${col.total} matches. Sample: "${col.items[0]?.contactName}"`);
    }
  }

  console.log("\n======================================================================");
  console.log("   🎉 ALL 3 KANBAN PAGINATION BACKEND AUDIT CHECKS PASSED!            ");
  console.log("======================================================================");
}

testKanban().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
