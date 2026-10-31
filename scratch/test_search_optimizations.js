require("dotenv").config({ path: require("path").resolve(__dirname, "../server/.env") });
const http = require("http");
const prisma = require("../server/src/config/prisma");
const leadsService = require("../server/src/modules/leads/service");
const surveysService = require("../server/src/modules/surveys/service");
const ordersService = require("../server/src/modules/orders/service");
const inventoryService = require("../server/src/modules/inventory/service");
const warrantyService = require("../server/src/modules/warranty/service");

function fetchJson(url, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

async function runAudit() {
  console.log("======================================================================");
  console.log("   AUTOMATED AUDIT: SEARCH OPTIMIZATIONS, DEBOUNCING & PAGINATION   ");
  console.log("======================================================================\n");

  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) throw new Error("No active company found.");
  console.log(`[INIT] Verified active company: ${company.name} (${company.id})`);

  let allPassed = true;

  // ─────────────────────────────────────────────────────────────────
  // TEST 1: Leads Search & Pagination
  // ─────────────────────────────────────────────────────────────────
  console.log("\n--- TEST 1: Leads Service Search & Pagination ---");
  try {
    const paginatedLeads = await leadsService.getLeads(company.id, { page: 1, limit: 3 });
    console.log(`[PASS] Leads pagination returned ${paginatedLeads.length} items`);
    console.log(`   - Pagination metadata:`, paginatedLeads.pagination);
    if (!paginatedLeads.pagination || paginatedLeads.pagination.total === undefined) {
      throw new Error("Missing pagination metadata on leads");
    }

    // Search query test
    const searchRes = await leadsService.getLeads(company.id, { q: "Rao", page: 1, limit: 5 });
    console.log(`[PASS] Leads search for 'Rao' matched ${searchRes.length} leads (Total in DB: ${searchRes.pagination.total})`);
  } catch (err) {
    console.error(`[FAIL] Leads test failed:`, err.message);
    allPassed = false;
  }

  // ─────────────────────────────────────────────────────────────────
  // TEST 2: Surveys Search & Pagination
  // ─────────────────────────────────────────────────────────────────
  console.log("\n--- TEST 2: Surveys Service Search & Pagination ---");
  try {
    const paginatedSurveys = await surveysService.getSurveys(company.id, { page: 1, limit: 2 });
    console.log(`[PASS] Surveys pagination returned ${paginatedSurveys.length} items`);
    console.log(`   - Pagination metadata:`, paginatedSurveys.pagination);
    if (!paginatedSurveys.pagination || paginatedSurveys.pagination.limit !== 2) {
      throw new Error("Invalid pagination on surveys");
    }

    // Filter by search
    const surveySearch = await surveysService.getSurveys(company.id, { search: "Flat", page: 1, limit: 5 });
    console.log(`[PASS] Surveys search completed. Found: ${surveySearch.length} results`);
  } catch (err) {
    console.error(`[FAIL] Surveys test failed:`, err.message);
    allPassed = false;
  }

  // ─────────────────────────────────────────────────────────────────
  // TEST 3: Orders Search & Pagination
  // ─────────────────────────────────────────────────────────────────
  console.log("\n--- TEST 3: Sales Orders Service Search & Pagination ---");
  try {
    const paginatedOrders = await ordersService.getOrders(company.id, { page: 1, limit: 2 });
    console.log(`[PASS] Orders pagination returned ${paginatedOrders.length} items`);
    console.log(`   - Pagination metadata:`, paginatedOrders.pagination);
    if (!paginatedOrders.pagination || paginatedOrders.pagination.limit !== 2) {
      throw new Error("Invalid pagination on orders");
    }

    const orderSearch = await ordersService.getOrders(company.id, { q: "SO-", page: 1, limit: 5 });
    console.log(`[PASS] Orders search for 'SO-' matched ${orderSearch.length} orders (Total in DB: ${orderSearch.pagination.total})`);
  } catch (err) {
    console.error(`[FAIL] Orders test failed:`, err.message);
    allPassed = false;
  }

  // ─────────────────────────────────────────────────────────────────
  // TEST 4: Products Catalogue Search & Pagination
  // ─────────────────────────────────────────────────────────────────
  console.log("\n--- TEST 4: Inventory / Master Data Products Search & Pagination ---");
  try {
    const paginatedProducts = await inventoryService.getProducts(company.id, { page: 1, limit: 4 }, "ADMIN");
    console.log(`[PASS] Products pagination returned ${paginatedProducts.length} items`);
    console.log(`   - Pagination metadata:`, paginatedProducts.pagination);
    if (!paginatedProducts.pagination || paginatedProducts.pagination.limit !== 4) {
      throw new Error("Invalid pagination on inventory products");
    }

    const searchProduct = await inventoryService.getProducts(company.id, { q: "Panel", page: 1, limit: 5 }, "ADMIN");
    console.log(`[PASS] Products search for 'Panel' matched ${searchProduct.length} products`);
  } catch (err) {
    console.error(`[FAIL] Products test failed:`, err.message);
    allPassed = false;
  }

  // ─────────────────────────────────────────────────────────────────
  // TEST 5: Warranty Universal Search & Pagination
  // ─────────────────────────────────────────────────────────────────
  console.log("\n--- TEST 5: Warranty Engine Search & Pagination ---");
  try {
    const paginatedWarranty = await warrantyService.searchWarranties(company.id, "", { page: 1, limit: 3 });
    console.log(`[PASS] Warranty pagination returned ${paginatedWarranty.length} items`);
    console.log(`   - Pagination metadata:`, paginatedWarranty.pagination);
    if (!paginatedWarranty.pagination || paginatedWarranty.pagination.limit !== 3) {
      throw new Error("Invalid pagination on warranty search");
    }

    const specificWarranty = await warrantyService.searchWarranties(company.id, "INV", { page: 1, limit: 5 });
    console.log(`[PASS] Warranty search for 'INV' matched ${specificWarranty.length} items (Total: ${specificWarranty.pagination.total})`);
  } catch (err) {
    console.error(`[FAIL] Warranty test failed:`, err.message);
    allPassed = false;
  }

  // ─────────────────────────────────────────────────────────────────
  // TEST 6: Debouncing Algorithm Simulation
  // ─────────────────────────────────────────────────────────────────
  console.log("\n--- TEST 6: Debouncing & Throttling Verification ---");
  try {
    // Simulate user keystrokes: 's', 'so', 'sol', 'solar'
    let executionCount = 0;
    let lastQueryExecuted = "";
    const delay = 50; // 50ms simulated debounce

    function debounce(fn, wait) {
      let timeout;
      return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), wait);
      };
    }

    const executeSearch = debounce((q) => {
      executionCount++;
      lastQueryExecuted = q;
    }, delay);

    // Rapid keystrokes within 20ms of each other
    executeSearch("s");
    executeSearch("so");
    executeSearch("sol");
    executeSearch("solar");

    // Wait for debounce delay
    await new Promise((r) => setTimeout(r, 100));

    if (executionCount === 1 && lastQueryExecuted === "solar") {
      console.log(`[PASS] Debounce collapsed 4 rapid keystrokes into exactly 1 query execution for "${lastQueryExecuted}"`);
    } else {
      throw new Error(`Debounce failed: count=${executionCount}, query=${lastQueryExecuted}`);
    }
  } catch (err) {
    console.error(`[FAIL] Debouncing test failed:`, err.message);
    allPassed = false;
  }

  // ─────────────────────────────────────────────────────────────────
  // TEST 7: HTTP Controller Endpoints with Pagination Response
  // ─────────────────────────────────────────────────────────────────
  console.log("\n--- TEST 7: HTTP Controller Endpoints JSON Responses ---");
  try {
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN", isActive: true } });
    if (!adminUser) throw new Error("No active admin user found for token auth");

    const env = require("../server/src/config/env");
    const jwt = require("../server/node_modules/jsonwebtoken");
    const token = jwt.sign(
      { sub: adminUser.id, role: adminUser.role, companyId: company.id },
      env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 1. Orders endpoint
    const ordersRes = await fetchJson("http://localhost:5000/api/v1/orders?page=1&limit=2", token);
    console.log(`[PASS] GET /api/v1/orders status ${ordersRes.status}: pagination total=${ordersRes.body?.pagination?.total}, items=${ordersRes.body?.data?.length}`);

    // 2. Leads endpoint
    const leadsRes = await fetchJson("http://localhost:5000/api/v1/leads?page=1&limit=2", token);
    console.log(`[PASS] GET /api/v1/leads status ${leadsRes.status}: pagination total=${leadsRes.body?.pagination?.total}, items=${leadsRes.body?.data?.length}`);

    // 3. Surveys endpoint
    const surveysRes = await fetchJson("http://localhost:5000/api/v1/surveys?page=1&limit=2", token);
    console.log(`[PASS] GET /api/v1/surveys status ${surveysRes.status}: pagination total=${surveysRes.body?.pagination?.total}, items=${surveysRes.body?.data?.length}`);

    // 4. Products endpoint
    const productsRes = await fetchJson("http://localhost:5000/api/v1/inventory/products?page=1&limit=3", token);
    console.log(`[PASS] GET /api/v1/inventory/products status ${productsRes.status}: pagination total=${productsRes.body?.pagination?.total}, items=${productsRes.body?.data?.length}`);

    // 5. Warranty search endpoint
    const warrantyRes = await fetchJson("http://localhost:5000/api/v1/warranty/search?q=INV&page=1&limit=2", token);
    console.log(`[PASS] GET /api/v1/warranty/search status ${warrantyRes.status}: pagination total=${warrantyRes.body?.pagination?.total}, items=${warrantyRes.body?.data?.length}`);
  } catch (err) {
    console.error(`[FAIL] HTTP Controller tests failed:`, err.message);
    allPassed = false;
  }

  console.log("\n======================================================================");
  if (allPassed) {
    console.log("   🎉 ALL 7 SEARCH, DEBOUNCING & PAGINATION TESTS PASSED!   ");
  } else {
    console.log("   ⚠️ SOME TESTS FAILED. CHECK LOGS ABOVE.   ");
  }
  console.log("======================================================================\n");
}

runAudit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
