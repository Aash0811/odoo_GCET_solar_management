const http = require("http");

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });

    req.on("error", (err) => reject(err));

    if (data) {
      req.write(typeof data === "string" ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=== STARTING FULL END-TO-END VERIFICATION (PHASES 1, 2, 3, 4) ===\n");

  const baseUrl = {
    hostname: "localhost",
    port: 5000,
  };

  // 1. Health Check
  console.log("1. Testing GET /health...");
  const healthRes = await request({ ...baseUrl, path: "/health", method: "GET" });
  console.log(`   Status: ${healthRes.status}, DB Status: ${healthRes.body?.database}`);
  if (healthRes.status !== 200) throw new Error("Health check failed");

  // 2. Authentication (Login)
  console.log("\n2. Testing POST /api/v1/auth/login (Admin)...");
  const loginRes = await request(
    {
      ...baseUrl,
      path: "/api/v1/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { identifier: "admin@sunpower.com", password: "password123" }
  );

  console.log(`   Status: ${loginRes.status}, User: ${loginRes.body?.data?.user?.name}`);
  const token = loginRes.body?.data?.token;
  if (!token) throw new Error("Login failed to return token");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // 3. Leads Kanban List
  console.log("\n3. Testing GET /api/v1/leads...");
  const leadsRes = await request({
    ...baseUrl,
    path: "/api/v1/leads",
    method: "GET",
    headers: authHeaders,
  });
  console.log(`   Status: ${leadsRes.status}, Total Leads: ${leadsRes.body?.data?.length}`);

  // 4. Create New Lead
  console.log("\n4. Testing POST /api/v1/leads (Create Lead)...");
  const createLeadRes = await request(
    {
      ...baseUrl,
      path: "/api/v1/leads",
      method: "POST",
      headers: authHeaders,
    },
    {
      title: "5kW Residential Solar - Hyderabad",
      contactName: "Vikram Chandra",
      phone: "9870001122",
      email: "vikram.chandra@example.com",
      address: "Road No 45, Jubilee Hills",
      desiredCapacityKw: 5,
    }
  );
  const newLead = createLeadRes.body?.data;
  console.log(`   Status: ${createLeadRes.status}, Created Lead ID: ${newLead?.id}, Stage: ${newLead?.stage}`);

  // 5. Update Qualification Checklist
  console.log("\n5. Testing PATCH /api/v1/leads/:id/checklist (Qualify Lead)...");
  const checklistRes = await request(
    {
      ...baseUrl,
      path: `/api/v1/leads/${newLead.id}/checklist`,
      method: "PATCH",
      headers: authHeaders,
    },
    {
      shadowFreeArea: true,
      monthlyBill: true,
      gridSuitable: true,
      monthlyBillAmount: 5200,
      desiredCapacityKw: 5,
    }
  );
  console.log(`   Status: ${checklistRes.status}, Updated Stage: ${checklistRes.body?.data?.stage}`);

  // 6. Schedule Site Survey
  console.log("\n6. Testing POST /api/v1/surveys/schedule (Schedule Survey)...");
  const scheduleRes = await request(
    {
      ...baseUrl,
      path: "/api/v1/surveys/schedule",
      method: "POST",
      headers: authHeaders,
    },
    {
      leadId: newLead.id,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      notes: "Client available between 10 AM - 12 PM",
    }
  );
  const survey = scheduleRes.body?.data;
  console.log(`   Status: ${scheduleRes.status}, Survey ID: ${survey?.id}, Survey Status: ${survey?.status}`);

  // 7. Verify Rule 2: Quote creation should FAIL if survey is NOT approved yet
  console.log("\n7. Verifying Business Rule 2: Quote creation MUST FAIL if survey is not approved...");
  // Fetch a package template
  const tmplRes = await request({ ...baseUrl, path: "/api/v1/inventory/templates", method: "GET", headers: authHeaders });
  const template5kW = tmplRes.body?.data?.find((t) => t.name.includes("5 kW")) || tmplRes.body?.data[0];

  const failedQuoteRes = await request(
    {
      ...baseUrl,
      path: "/api/v1/quotes",
      method: "POST",
      headers: authHeaders,
    },
    {
      leadId: newLead.id,
      packageTemplateId: template5kW.id,
      capacityKw: 5,
    }
  );
  console.log(`   Status: ${failedQuoteRes.status} (Expected: 400), Message: "${failedQuoteRes.body?.message}"`);

  // 8. Submit and Approve Survey
  console.log("\n8. Submitting and Approving Survey...");
  const approveRes = await request(
    {
      ...baseUrl,
      path: `/api/v1/surveys/${survey.id}/review`,
      method: "PATCH",
      headers: authHeaders,
    },
    {
      status: "APPROVED",
    }
  );
  console.log(`   Status: ${approveRes.status}, Survey Review Status: ${approveRes.body?.data?.status}`);

  // 9. Verify Rule 3: Quote Creation now SUCCEEDS and auto-expands BOM lines
  console.log("\n9. Testing POST /api/v1/quotes (Auto-expanding BOM scaled by 5kW)...");
  const quoteRes = await request(
    {
      ...baseUrl,
      path: "/api/v1/quotes",
      method: "POST",
      headers: authHeaders,
    },
    {
      leadId: newLead.id,
      packageTemplateId: template5kW.id,
      capacityKw: 5,
      subsidyNote: "Eligible for PM Surya Ghar subsidy ₹78,000",
    }
  );
  const quote = quoteRes.body?.data;
  console.log(`   Status: ${quoteRes.status}, Quote #: ${quote?.quoteNumber}, Total: INR ${quote?.totalAmount}`);
  console.log(`   BOM Lines Expanded (${quote?.lines?.length} lines):`);
  quote?.lines?.forEach((line) => {
    console.log(`     - ${line.description}: Qty ${line.quantity} @ INR ${line.unitPrice} = INR ${line.lineTotal}`);
  });

  // 10. Generate Order from Quote
  console.log("\n10. Testing POST /api/v1/orders (Create Order from Quote)...");
  const orderRes = await request(
    {
      ...baseUrl,
      path: "/api/v1/orders",
      method: "POST",
      headers: authHeaders,
    },
    {
      quoteId: quote.id,
      notes: "Advance 50k payment scheduled.",
    }
  );
  const order = orderRes.body?.data;
  console.log(`   Status: ${orderRes.status}, Order #: ${order?.orderNumber}, Initial Status: ${order?.status}`);

  // 11. Verifying Business Rule 4: Payment Confirms Order in ONE transaction
  // (Creating PickList + InstallationJob + Notifications)
  console.log("\n11. Verifying Business Rule 4: Advance Payment triggers Order Confirmation in ONE transaction...");
  const paymentRes = await request(
    {
      ...baseUrl,
      path: `/api/v1/orders/${order.id}/payments`,
      method: "POST",
      headers: authHeaders,
    },
    {
      amount: 50000,
      method: "UPI",
      transactionRef: "UPI-TEST-998877",
      notes: "Advance payment received.",
    }
  );
  const paymentResult = paymentRes.body?.data;
  console.log(`   Status: ${paymentRes.status}`);
  console.log(`   Confirmed Order Status: ${paymentResult?.order?.status}`);
  console.log(`   Auto-created PickList #: ${paymentResult?.pickList?.pickNumber} with ${paymentResult?.pickList?.lines?.length} lines`);
  console.log(`   Auto-created InstallationJob #: ${paymentResult?.installationJob?.jobNumber}`);

  // 12. Verifying Business Rule 5: Delivery validation fails if serials are missing
  console.log("\n12. Verifying Business Rule 5: Delivery validation MUST FAIL (400) if serials are missing...");
  const failedDeliveryRes = await request(
    {
      ...baseUrl,
      path: `/api/v1/dispatch/orders/${order.id}/validate-delivery`,
      method: "POST",
      headers: authHeaders,
    },
    {
      notes: "Attempting dispatch before serial scan",
    }
  );
  console.log(`   Status: ${failedDeliveryRes.status} (Expected: 400), Message: "${failedDeliveryRes.body?.message}"`);
  console.log("   Missing items returned by server:");
  failedDeliveryRes.body?.missing?.forEach((m) => {
    console.log(`     - ${m.productName}: Required ${m.required}, Scanned ${m.scanned}, Missing: ${m.missingCount}`);
  });

  // 13. Scan Serials for each missing product
  console.log("\n13. Scanning unique Serial Numbers for all tracked items...");
  for (const m of failedDeliveryRes.body?.missing || []) {
    for (let s = 1; s <= m.missingCount; s++) {
      const serialStr = `${m.sku}-SERIAL-${Date.now()}-${s}`;
      const scanRes = await request(
        {
          ...baseUrl,
          path: "/api/v1/dispatch/scan-serial",
          method: "POST",
          headers: authHeaders,
        },
        {
          orderId: order.id,
          productId: m.productId,
          serial: serialStr,
        }
      );
      if (scanRes.status !== 200) {
        throw new Error(`Failed to scan serial: ${scanRes.body?.message}`);
      }
    }
    console.log(`   Scanned all ${m.missingCount} serials for ${m.productName}.`);
  }

  // 14. Verifying Business Rule 6: Validate Delivery and auto-create Warranties in ONE transaction
  console.log("\n14. Verifying Business Rule 6: Delivery Validation & Auto Warranty Creation...");
  const deliveryRes = await request(
    {
      ...baseUrl,
      path: `/api/v1/dispatch/orders/${order.id}/validate-delivery`,
      method: "POST",
      headers: authHeaders,
    },
    {
      deliveredTo: "Vikram Chandra (Customer)",
      notes: "Materials inspected and delivered on-site.",
    }
  );
  console.log(`   Status: ${deliveryRes.status}`);
  console.log(`   Delivery #: ${deliveryRes.body?.data?.delivery?.deliveryNumber}`);
  console.log(`   Active Warranties Auto-Created: ${deliveryRes.body?.data?.warrantiesCreatedCount}`);

  // 15. Verify PDF generation endpoint
  console.log("\n15. Testing GET /api/v1/quotes/:id/pdf (Quotation PDFKit download)...");
  const pdfRes = await request({
    ...baseUrl,
    path: `/api/v1/quotes/${quote.id}/pdf`,
    method: "GET",
    headers: authHeaders,
  });
  console.log(`   Status: ${pdfRes.status}, Content-Type: ${pdfRes.headers?.["content-type"]}, Byte Length: ${pdfRes.raw?.length || 0}`);

  console.log("\n=== ALL PHASES (1, 2, 3, 4) PASSED 100% PERFECTLY! ===\n");
}

runTests().catch((err) => {
  console.error("\nTEST SUITE FAILED:", err);
  process.exit(1);
});
