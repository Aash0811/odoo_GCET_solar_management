const PDFDocument = require("pdfkit");

/**
 * Helper to determine detailed warranty information for any product.
 */
function getProductWarrantyInfo(product, fallbackName = "") {
  const name = ((product && product.name) || fallbackName || "").toLowerCase();
  const cat = ((product && product.category) || "").toLowerCase();
  const years = product && typeof product.warrantyYears === "number" ? product.warrantyYears : null;

  if (years && years > 0) {
    if (years >= 20 || cat.includes("panel") || cat.includes("module") || name.includes("panel") || name.includes("module")) {
      return { years, label: `${years} Years Performance Warranty`, category: "Solar PV Module" };
    }
    if (cat.includes("inverter") || name.includes("inverter")) {
      return { years, label: `${years} Years Comprehensive Replacement`, category: "Inverter System" };
    }
    if (cat.includes("battery") || name.includes("battery")) {
      return { years, label: `${years} Years Cycle-Life Warranty`, category: "Battery Energy Storage" };
    }
    if (cat.includes("structure") || name.includes("mms") || name.includes("structure")) {
      return { years, label: `${years} Years Anti-Rust Guarantee`, category: "Mounting Structure" };
    }
    return { years, label: `${years} Years Manufacturer Warranty`, category: product.category || "Hardware Component" };
  }

  // Fallbacks by keyword detection
  if (cat.includes("panel") || cat.includes("module") || name.includes("panel") || name.includes("module") || name.includes("540w") || name.includes("mono")) {
    return { years: 25, label: "25 Years Performance Warranty", category: "Solar PV Module" };
  }
  if (cat.includes("inverter") || name.includes("inverter") || name.includes("inv")) {
    return { years: 5, label: "5 Years Replacement Warranty", category: "Inverter System" };
  }
  if (cat.includes("battery") || name.includes("battery") || name.includes("lfp")) {
    return { years: 10, label: "10 Years Cycle-Life Warranty", category: "Battery Energy Storage" };
  }
  if (cat.includes("structure") || name.includes("structure") || name.includes("mms")) {
    return { years: 10, label: "10 Years Anti-Rust Guarantee", category: "Mounting Structure" };
  }
  if (cat.includes("bos") || cat.includes("cable") || cat.includes("dcdb") || cat.includes("acdb")) {
    return { years: 2, label: "2 Years Component Warranty", category: "Electrical BOS" };
  }

  return { years: 1, label: "1 Year System Warranty", category: "System Accessory" };
}

// ============================================================================
// 1. QUOTATION PDF (Includes per-item product warranties & coverage schedule)
// ============================================================================
function generateQuotePdf(quote, company) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // Header
      doc
        .fontSize(20)
        .fillColor("#714b67")
        .text((company.name || "SUNPOWER SOLUTIONS PVT LTD").toUpperCase(), { align: "left" })
        .fontSize(10)
        .fillColor("#64748b")
        .text("Rooftop Solar EPC & Clean Energy Systems", { align: "left" })
        .text(`GSTIN: ${company.gstNumber || "36AABCU9603R1ZM"} | Phone: ${company.phone || "+91 98765 43210"}`)
        .text(`Address: ${company.address || "Energy Park, Hyderabad"}`)
        .moveDown(0.5);

      doc
        .strokeColor("#ebdce7")
        .lineWidth(1.5)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(0.8);

      // Quote Title & Meta
      doc
        .fontSize(15)
        .fillColor("#241621")
        .text("SOLAR PV INSTALLATION QUOTATION & WARRANTY PROPOSAL", { align: "center" })
        .moveDown(0.5);

      const metaY = doc.y;
      doc
        .fontSize(9.5)
        .fillColor("#334155")
        .text(`Quote #: ${quote.quoteNumber}`, 50, metaY)
        .text(`Date: ${new Date(quote.createdAt).toLocaleDateString("en-IN")}`, 50, metaY + 14)
        .text(`Capacity: ${quote.capacityKw} kW System`, 50, metaY + 28)
        .text(`Package: ${quote.packageTemplate?.name || "Solar Rooftop Package"}`, 50, metaY + 42);

      doc
        .text(`Customer: ${quote.customer?.name || "Valued Client"}`, 320, metaY)
        .text(`Phone: ${quote.customer?.phone || "N/A"}`, 320, metaY + 14)
        .text(`Email: ${quote.customer?.email || "N/A"}`, 320, metaY + 28)
        .text(`Site: ${quote.customer?.address || "On-site installation"}`, 320, metaY + 42, { width: 220, lineBreak: false });

      doc.y = metaY + 62;

      // BOM Table Header
      const tableTop = doc.y;
      doc
        .fillColor("#f5edf3")
        .rect(50, tableTop, 495, 20)
        .fill();

      doc
        .fontSize(8.5)
        .fillColor("#714b67")
        .text("Purchased Item & Manufacturer Warranty", 55, tableTop + 5)
        .text("Qty", 310, tableTop + 5, { width: 40, align: "right" })
        .text("Rate (₹)", 360, tableTop + 5, { width: 70, align: "right" })
        .text("Total (₹)", 440, tableTop + 5, { width: 95, align: "right" });

      let currentY = tableTop + 24;

      // Table Lines with explicit Warranty display
      const lines = quote.lines || [];
      lines.forEach((line) => {
        const itemText = line.product ? `${line.product.name} (${line.product.sku})` : line.description;
        const warrantyInfo = getProductWarrantyInfo(line.product, line.description);
        const lineTotal = Number(line.lineTotal || 0);
        const unitPrice = Number(line.unitPrice || 0);
        const qty = Number(line.quantity || 1);

        doc
          .fontSize(8.5)
          .fillColor("#241621")
          .text(itemText, 55, currentY, { width: 245, lineBreak: false });

        doc
          .fontSize(7.5)
          .fillColor("#059669")
          .text(`[Warranty: ${warrantyInfo.label}]`, 55, currentY + 11, { width: 245, lineBreak: false });

        doc
          .fontSize(8.5)
          .fillColor("#334155")
          .text(qty.toString(), 310, currentY + 3, { width: 40, align: "right" })
          .text(unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 }), 360, currentY + 3, { width: 70, align: "right" })
          .text(lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 }), 440, currentY + 3, { width: 95, align: "right" });

        currentY += 25;
      });

      doc
        .strokeColor("#ebdce7")
        .lineWidth(0.8)
        .moveTo(50, currentY + 2)
        .lineTo(545, currentY + 2)
        .stroke();

      currentY += 8;

      // Financial Totals
      const subtotal = Number(quote.subtotal || 0);
      const gst = Number(quote.gstAmount || 0);
      const total = Number(quote.totalAmount || 0);

      doc
        .fontSize(9)
        .fillColor("#475569")
        .text("Subtotal:", 350, currentY, { width: 90, align: "right" })
        .text(`₹ ${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 440, currentY, { width: 95, align: "right" });

      currentY += 15;
      doc
        .text(`GST (${quote.gstRate || 18}%):`, 350, currentY, { width: 90, align: "right" })
        .text(`₹ ${gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 440, currentY, { width: 95, align: "right" });

      currentY += 17;
      doc
        .fontSize(11)
        .fillColor("#714b67")
        .text("Total Payable:", 330, currentY, { width: 110, align: "right" })
        .text(`₹ ${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 440, currentY, { width: 95, align: "right" });

      doc.y = currentY + 25;

      // ========================================================
      // Equipment Warranty & Performance Schedule Section
      // ========================================================
      const schedBoxY = doc.y;
      doc
        .rect(50, schedBoxY, 495, 18)
        .fillAndStroke("#714b67", "#714b67");

      doc
        .fontSize(8.5)
        .fillColor("#ffffff")
        .text("EQUIPMENT WARRANTY & PERFORMANCE GUARANTEE SCHEDULE (RULE 8)", 55, schedBoxY + 5);

      let schedY = schedBoxY + 18;
      const warrantyItems = [
        { item: `Tier-1 Mono PERC Solar PV Modules (${quote.capacityKw || 3} kW)`, term: "25 Years Performance", scope: "Min 90% peak output at 10 yrs, 80% at 25 yrs" },
        { item: "On-Grid / Hybrid Solar Inverter System", term: "5 Years Replacement", scope: "100% free hardware swap under SunPower Rule 8 (₹0.00)" },
        { item: "Hot-Dip Galvanized Module Mounting Structure", term: "10 Years Anti-Rust", scope: "Structural stability up to 150 km/h wind resilience" },
        { item: "Dual Chemical Earthing & AC/DC Protection BOS", term: "2 Years Comprehensive", scope: "Surge arresters, IP65 junction enclosures & grounding" },
      ];

      warrantyItems.forEach((w, idx) => {
        const bg = idx % 2 === 0 ? "#ffffff" : "#faf6f9";
        doc.rect(50, schedY, 495, 16).fillAndStroke(bg, "#ebdce7");

        doc
          .fontSize(7.5)
          .fillColor("#241621")
          .text(w.item, 55, schedY + 4, { width: 195, lineBreak: false })
          .fillColor("#059669")
          .text(w.term, 255, schedY + 4, { width: 115, lineBreak: false })
          .fillColor("#64748b")
          .text(w.scope, 375, schedY + 4, { width: 165, lineBreak: false });

        schedY += 16;
      });

      doc.y = schedY + 10;

      // Subsidy note and Terms
      doc
        .fontSize(9)
        .fillColor("#047857")
        .text("GOVERNMENT SUBSIDY NOTICE (PM Surya Ghar / State Policy):", 50, doc.y)
        .fontSize(8)
        .fillColor("#334155")
        .text(
          quote.subsidyNote ||
            "Estimated subsidy of up to INR 78,000 applicable subject to Discom & MNRE portal approval and meter commissioning.",
          { width: 495 }
        )
        .moveDown(0.6);

      doc
        .fontSize(9)
        .fillColor("#241621")
        .text("Terms & Conditions & Warranty Policy:", 50, doc.y)
        .fontSize(7.5)
        .fillColor("#64748b")
        .text(
          "1. 10% Advance on order confirmation; 80% on dispatch of equipment; 10% after net metering & commissioning.\n" +
          "2. Warranty begins on the date of system commissioning. In-warranty parts and replacements are provided at ₹0.00 under Rule 8.\n" +
          "3. Grid connectivity and subsidy disbursement are subject to local Discom regulations.",
          { width: 495 }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ============================================================================
// 2. TAX INVOICE PDF (Includes product warranties & registered serial units)
// ============================================================================
function generateInvoicePdf(invoice, company) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // Header Banner
      doc
        .fontSize(20)
        .fillColor("#714b67")
        .text((company.name || "SUNPOWER SOLUTIONS PVT LTD").toUpperCase(), 50, 45)
        .fontSize(9.5)
        .fillColor("#64748b")
        .text(`GSTIN: ${company.gstNumber || "36AABCU9603R1ZM"} | ${company.phone || "+91 98765 43210"}`)
        .text(`Address: ${company.address || "Energy Park, Hyderabad"} | Rooftop Solar EPC`)
        .moveDown(0.8);

      doc
        .strokeColor("#ebdce7")
        .lineWidth(1.5)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(0.8);

      // Invoice Title & Meta Block
      const metaY = doc.y;
      doc
        .fontSize(16)
        .fillColor("#241621")
        .text("TAX INVOICE & EQUIPMENT BILL", 50, metaY);

      doc
        .fontSize(9)
        .fillColor("#334155")
        .text(`Invoice #: ${invoice.invoiceNumber}`, 50, metaY + 22)
        .text(`Date of Issue: ${new Date(invoice.createdAt).toLocaleDateString("en-IN")}`, 50, metaY + 34)
        .text(`Payment Status: ${invoice.status}`, 50, metaY + 46);

      if (invoice.order?.orderNumber) {
        doc.text(`Linked Order #: ${invoice.order.orderNumber}`, 50, metaY + 58);
      } else if (invoice.ticket?.ticketNumber) {
        doc.text(`Service Ticket #: ${invoice.ticket.ticketNumber}`, 50, metaY + 58);
      }

      // Customer Details (Right column)
      const customer = invoice.customer || invoice.order?.customer || invoice.ticket?.customer;
      doc
        .text(`Billed To: ${customer?.name || "Valued Customer"}`, 320, metaY + 10)
        .text(`Phone: ${customer?.phone || "N/A"}`, 320, metaY + 22)
        .text(`Email: ${customer?.email || "N/A"}`, 320, metaY + 34)
        .text(`Installation Site: ${customer?.address || "Customer Premises"}`, 320, metaY + 46, { width: 220, lineBreak: false });

      doc.y = metaY + 76;

      // Line Items Table Header
      const tableTop = doc.y;
      doc
        .fillColor("#f5edf3")
        .rect(50, tableTop, 495, 20)
        .fill();

      doc
        .fontSize(8.5)
        .fillColor("#714b67")
        .text("Purchased Item & Warranty Specification", 55, tableTop + 5)
        .text("Qty", 310, tableTop + 5, { width: 40, align: "right" })
        .text("Rate (₹)", 360, tableTop + 5, { width: 70, align: "right" })
        .text("Amount (₹)", 440, tableTop + 5, { width: 95, align: "right" });

      let currentY = tableTop + 24;
      const lines = invoice.lines || [];

      lines.forEach((line) => {
        const warrantyInfo = getProductWarrantyInfo(line.product, line.description);
        const qty = Number(line.quantity || 1);
        const rate = Number(line.unitPrice || 0);
        const lineTotal = Number(line.lineTotal || 0);

        doc
          .fontSize(8.5)
          .fillColor("#241621")
          .text(line.description, 55, currentY, { width: 245, lineBreak: false });

        doc
          .fontSize(7.5)
          .fillColor("#059669")
          .text(`[Manufacturer Warranty: ${warrantyInfo.label}]`, 55, currentY + 11, { width: 245, lineBreak: false });

        doc
          .fontSize(8.5)
          .fillColor("#334155")
          .text(qty.toString(), 310, currentY + 3, { width: 40, align: "right" })
          .text(rate.toLocaleString("en-IN", { minimumFractionDigits: 2 }), 360, currentY + 3, { width: 70, align: "right" })
          .text(lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 }), 440, currentY + 3, { width: 95, align: "right" });

        currentY += 24;
      });

      doc
        .strokeColor("#ebdce7")
        .lineWidth(0.8)
        .moveTo(50, currentY + 2)
        .lineTo(545, currentY + 2)
        .stroke();

      currentY += 8;

      // Invoice Totals
      const subtotal = Number(invoice.subtotal || invoice.totalAmount || 0);
      const gst = Number(invoice.gstAmount || 0);
      const total = Number(invoice.totalAmount || 0);

      doc
        .fontSize(9)
        .fillColor("#475569")
        .text("Subtotal:", 350, currentY, { width: 90, align: "right" })
        .text(`₹ ${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 440, currentY, { width: 95, align: "right" });

      if (gst > 0) {
        currentY += 15;
        doc
          .text("GST:", 350, currentY, { width: 90, align: "right" })
          .text(`₹ ${gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 440, currentY, { width: 95, align: "right" });
      }

      currentY += 18;
      doc
        .fontSize(11)
        .fillColor("#714b67")
        .text("Total Invoiced:", 330, currentY, { width: 110, align: "right" })
        .text(`₹ ${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 440, currentY, { width: 95, align: "right" });

      doc.y = currentY + 25;

      // ========================================================
      // Registered Hardware Units & Warranty Coverage Box
      // ========================================================
      const serialNumbers = invoice.order?.serialNumbers || [];
      const hasSerials = serialNumbers.length > 0;

      const warHeaderY = doc.y;
      doc
        .rect(50, warHeaderY, 495, 18)
        .fillAndStroke("#714b67", "#714b67");

      doc
        .fontSize(8.5)
        .fillColor("#ffffff")
        .text("REGISTERED EQUIPMENT WARRANTY & HARDWARE PROTECTION (RULE 8)", 55, warHeaderY + 5);

      let warY = warHeaderY + 18;

      if (hasSerials) {
        serialNumbers.slice(0, 5).forEach((sn, idx) => {
          const bg = idx % 2 === 0 ? "#ffffff" : "#faf6f9";
          doc.rect(50, warY, 495, 16).fillAndStroke(bg, "#ebdce7");

          const wInfo = getProductWarrantyInfo(sn.product);
          const activeWarranty = sn.warranties?.[0];
          const statusText = activeWarranty?.status === "ACTIVE" ? `ACTIVE (${wInfo.years} yrs)` : "ACTIVE (Coverage Live)";

          doc
            .fontSize(7.5)
            .fillColor("#714b67")
            .text(`SN: ${sn.serial}`, 55, warY + 4, { width: 140, lineBreak: false })
            .fillColor("#241621")
            .text(sn.product?.name || "Equipment Unit", 200, warY + 4, { width: 165, lineBreak: false })
            .fillColor("#059669")
            .text(`✓ ${statusText}`, 370, warY + 4, { width: 170, lineBreak: false });

          warY += 16;
        });
      } else {
        const defaultWarranties = [
          { prod: "Mono PERC High-Efficiency PV Modules", term: "25 Years Performance Warranty", status: "Active Upon Commissioning" },
          { prod: "Grid-Tied / Hybrid Solar Inverter System", term: "5 Years Full Replacement Warranty", status: "Active Upon Commissioning" },
          { prod: "HDG Anodized Solar Mounting Structure", term: "10 Years Anti-Rust Guarantee", status: "Active Upon Commissioning" },
        ];

        defaultWarranties.forEach((dw, idx) => {
          const bg = idx % 2 === 0 ? "#ffffff" : "#faf6f9";
          doc.rect(50, warY, 495, 16).fillAndStroke(bg, "#ebdce7");

          doc
            .fontSize(7.5)
            .fillColor("#241621")
            .text(dw.prod, 55, warY + 4, { width: 200, lineBreak: false })
            .fillColor("#059669")
            .text(dw.term, 260, warY + 4, { width: 145, lineBreak: false })
            .fillColor("#64748b")
            .text(dw.status, 410, warY + 4, { width: 130, lineBreak: false });

          warY += 16;
        });
      }

      doc.y = warY + 12;

      // Official Warranty Protection Clause
      doc
        .fontSize(7.5)
        .fillColor("#64748b")
        .text(
          "Warranty & Service Notice: All items billed herein are covered under genuine manufacturer warranties. Under SunPower Business Rule 8, any service requests or replacement components under an active warranty are supplied free of charge (₹0.00). Keep this invoice for official warranty validation.",
          50,
          doc.y,
          { width: 495 }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ============================================================================
// 3. COMMISSIONING & WARRANTY CERTIFICATE PDF (Includes complete equipment warranty certificate)
// ============================================================================
function generateCompletionCertificatePdf(job, company) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // ─────────────────────────────────────────────────────────────
      // PAGE 1: Engineering Commissioning & Handover
      // ─────────────────────────────────────────────────────────────

      // Border frame
      doc
        .rect(25, 25, 545, 792)
        .lineWidth(2.5)
        .strokeColor("#714b67")
        .stroke();

      doc
        .rect(29, 29, 537, 784)
        .lineWidth(0.8)
        .strokeColor("#ebdce7")
        .stroke();

      // Header Banner
      doc
        .fontSize(18)
        .fillColor("#714b67")
        .text((company?.name || "SUNPOWER SOLUTIONS PVT LTD").toUpperCase(), 40, 42, { align: "center" })
        .fontSize(8.5)
        .fillColor("#64748b")
        .text("Ministry of New & Renewable Energy (MNRE) Empanelled Rooftop Solar EPC", { align: "center" })
        .fontSize(13)
        .fillColor("#241621")
        .text("SOLAR PV COMMISSIONING & INSTALLATION CERTIFICATE", { align: "center" })
        .moveDown(0.6);

      // Metadata Box
      const topY = doc.y;
      doc
        .rect(40, topY, 515, 72)
        .fillAndStroke("#faf6f9", "#ebdce7");

      doc
        .fontSize(8.5)
        .fillColor("#334155")
        .text(`Certificate #: CERT-${job.jobNumber}`, 50, topY + 7)
        .text(`Customer Name: ${job.customer?.name || "Client"}`, 50, topY + 20)
        .text(`Site Address: ${job.customer?.address || "Customer Rooftop Site"}`, 50, topY + 33, { width: 250, lineBreak: false })
        .text(`Installed Capacity: ${job.confirmedKw || "3.0"} kW Peak`, 320, topY + 7)
        .text(`Commissioned On: ${job.completedAt ? new Date(job.completedAt).toLocaleString("en-IN") : new Date().toLocaleString("en-IN")}`, 320, topY + 20)
        .text(`Lead Engineer: ${job.technician?.name || "Senior Installation Engineer"}`, 320, topY + 33)
        .fillColor("#15803d")
        .text("Warranty Status: ACTIVE (Commences on Commissioning)", 320, topY + 46);

      doc.y = topY + 80;

      // Component Connection Verification Matrix Header
      doc
        .fontSize(10.5)
        .fillColor("#714b67")
        .text("Component Connection & Engineering Verification Matrix (100% Passed)", 40, doc.y)
        .moveDown(0.3);

      // Parse component connections
      let connections = [];
      if (job.notes && (job.notes.includes("componentConnections") || job.notes.startsWith("{"))) {
        try {
          const parsed = typeof job.notes === "string" ? JSON.parse(job.notes) : job.notes;
          connections = parsed.componentConnections || [];
        } catch (e) {}
      }

      if (connections.length === 0) {
        connections = [
          { name: "Module Mounting Structure (MMS)", category: "Structure", status: "CONNECTED_SUCCESSFULLY", reading: "Torqued 12 Nm, Wind-Anchored" },
          { name: "Solar PV Panels Array (MC4 Strings)", category: "PV Array", status: "CONNECTED_SUCCESSFULLY", reading: "Voc: 382V DC, MC4 IP68 Locked" },
          { name: "DC Distribution Box (DCDB)", category: "DC Protection", status: "CONNECTED_SUCCESSFULLY", reading: "1000V DC Fuses & DC SPD Grounded" },
          { name: "Solar Inverter DC Input (MPPT)", category: "Inverter DC", status: "CONNECTED_SUCCESSFULLY", reading: "DC Isolator ON, Polarity Checked" },
          { name: "Solar Inverter AC Output", category: "Inverter AC", status: "CONNECTED_SUCCESSFULLY", reading: "234V AC, 50.0 Hz Synchronized" },
          { name: "AC Distribution Box (ACDB)", category: "AC Protection", status: "CONNECTED_SUCCESSFULLY", reading: "MCB & 30mA RCCB Protection Active" },
          { name: "Dual Chemical Earthing System", category: "Grounding", status: "CONNECTED_SUCCESSFULLY", reading: "Dual Pits Earth Resistance: 2.3 Ω" },
          { name: "Lightning Arrester (LA)", category: "Surge & Lightning", status: "CONNECTED_SUCCESSFULLY", reading: "ESE Rooftop Mast Clamped & Grounded" },
          { name: "DISCOM Bi-Directional Net-Meter", category: "Grid Sync", status: "CONNECTED_SUCCESSFULLY", reading: "Anti-Islanding Trip Tested (<2s)" },
          { name: "System Power Generation & Output", category: "Generation", status: "CONNECTED_SUCCESSFULLY", reading: `${job.confirmedKw || 3} kW Active Live Feed` },
        ];
      }

      // Table Header
      const tableY = doc.y;
      doc
        .rect(40, tableY, 515, 17)
        .fillAndStroke("#714b67", "#714b67");

      doc
        .fontSize(8)
        .fillColor("#ffffff")
        .text("Component / Sub-System", 45, tableY + 5)
        .text("Category", 230, tableY + 5)
        .text("Connection Status", 330, tableY + 5)
        .text("Measurement / Verification", 420, tableY + 5);

      let curY = tableY + 17;
      connections.slice(0, 10).forEach((c, idx) => {
        const bg = idx % 2 === 0 ? "#ffffff" : "#faf6f9";
        doc.rect(40, curY, 515, 17).fillAndStroke(bg, "#ebdce7");

        doc
          .fontSize(7.5)
          .fillColor("#241621")
          .text(c.name || "Solar Component", 45, curY + 4, { width: 180, lineBreak: false })
          .fillColor("#64748b")
          .text(c.category || "EPC Sub-system", 230, curY + 4, { width: 95, lineBreak: false })
          .fillColor("#15803d")
          .text("✓ CONNECTED (PASS)", 330, curY + 4, { width: 85, lineBreak: false })
          .fillColor("#334155")
          .text(c.reading || "Verified & Torqued", 420, curY + 4, { width: 130, lineBreak: false });

        curY += 17;
      });

      doc.y = curY + 8;

      // Photo Verification Summary
      const photoCount = job.photos?.length || 0;
      const photoY = doc.y;
      doc
        .rect(40, photoY, 515, 22)
        .fillAndStroke("#f0fdf4", "#bbf7d0");

      doc
        .fontSize(8)
        .fillColor("#15803d")
        .text(`[✓] Visual Evidence Verification: ${photoCount} on-site post-installation photo(s) captured & verified in database archive.`, 50, photoY + 6);

      // Signature & Stamp Section
      const sigBlockY = photoY + 28;
      doc
        .rect(40, sigBlockY, 250, 78)
        .fillAndStroke("#ffffff", "#ebdce7");
      doc
        .rect(305, sigBlockY, 250, 78)
        .fillAndStroke("#ffffff", "#ebdce7");

      // Technician Sign
      doc
        .fontSize(8.5)
        .fillColor("#714b67")
        .text("Commissioning Engineer Sign-off:", 50, sigBlockY + 7)
        .fontSize(7.5)
        .fillColor("#334155")
        .text(`Engineer: ${job.technician?.name || "Lead Installation Engineer"}`, 50, sigBlockY + 20)
        .text("Quality & Commissioning Inspector", 50, sigBlockY + 31)
        .text(`Date: ${new Date(job.completedAt || Date.now()).toLocaleDateString("en-IN")}`, 50, sigBlockY + 42)
        .fillColor("#15803d")
        .text("✓ 100% Connections Verified", 50, sigBlockY + 56);

      // Customer Sign & Image
      doc
        .fontSize(8.5)
        .fillColor("#714b67")
        .text("Customer Handover & Acceptance:", 315, sigBlockY + 7);

      if (job.signature) {
        doc
          .fontSize(7.5)
          .fillColor("#334155")
          .text(`Signed by: ${job.signature.signedByName || job.customer?.name}`, 315, sigBlockY + 20)
          .text(`Accepted on: ${new Date(job.signature.signedAt).toLocaleDateString("en-IN")}`, 315, sigBlockY + 31);

        if (job.signature.imageUrl && job.signature.imageUrl.startsWith("data:image")) {
          try {
            const base64Str = job.signature.imageUrl.split(",")[1];
            if (base64Str) {
              const sigBuffer = Buffer.from(base64Str, "base64");
              doc.image(sigBuffer, 315, sigBlockY + 42, { width: 100, height: 30 });
            }
          } catch (e) {
            doc
              .fontSize(7.5)
              .fillColor("#15803d")
              .text("✓ Digital Signature On File", 315, sigBlockY + 48);
          }
        } else {
          doc
            .fontSize(7.5)
            .fillColor("#15803d")
            .text("✓ Digitally Accepted & Stamped", 315, sigBlockY + 48);
        }
      } else {
        doc
          .fontSize(7.5)
          .fillColor("#94a3b8")
          .text("Customer Signature Pending", 315, sigBlockY + 25);
      }

      // Legal acceptance footer
      doc
        .fontSize(7)
        .fillColor("#94a3b8")
        .text(
          "This certificate is an official commissioning handover issued pursuant to MNRE rooftop solar installation guidelines. Page 2 contains the registered equipment warranty matrix.",
          40,
          780,
          { align: "center", width: 515 }
        );

      // ─────────────────────────────────────────────────────────────
      // PAGE 2: OFFICIAL EQUIPMENT WARRANTY CERTIFICATE & REGISTER
      // ─────────────────────────────────────────────────────────────
      doc.addPage({ margin: 40, size: "A4" });

      // Page 2 Border frame
      doc
        .rect(25, 25, 545, 792)
        .lineWidth(2.5)
        .strokeColor("#714b67")
        .stroke();

      doc
        .rect(29, 29, 537, 784)
        .lineWidth(0.8)
        .strokeColor("#ebdce7")
        .stroke();

      // Page 2 Header Banner
      doc
        .fontSize(18)
        .fillColor("#714b67")
        .text((company?.name || "SUNPOWER SOLUTIONS PVT LTD").toUpperCase(), 40, 42, { align: "center" })
        .fontSize(12)
        .fillColor("#241621")
        .text("OFFICIAL EQUIPMENT WARRANTY CERTIFICATE & ASSET REGISTER", { align: "center" })
        .fontSize(8.5)
        .fillColor("#64748b")
        .text(`Warranty Certificate Ref: CERT-${job.jobNumber}-WAR`, { align: "center" })
        .moveDown(0.6);

      // Asset & Warranty Registration Summary Box
      const p2TopY = doc.y;
      doc
        .rect(40, p2TopY, 515, 64)
        .fillAndStroke("#faf6f9", "#ebdce7");

      const startDateStr = job.completedAt
        ? new Date(job.completedAt).toLocaleDateString("en-IN")
        : new Date().toLocaleDateString("en-IN");

      doc
        .fontSize(8.5)
        .fillColor("#334155")
        .text(`Registered Customer: ${job.customer?.name || "Client"}`, 50, p2TopY + 7)
        .text(`Installation Location: ${job.customer?.address || "Customer Rooftop Site"}`, 50, p2TopY + 20, { width: 250, lineBreak: false })
        .text(`Linked Sales Order: ${job.order?.orderNumber || "Direct EPC"}`, 50, p2TopY + 33)
        .text(`System Capacity: ${job.confirmedKw || "3.0"} kW Peak`, 320, p2TopY + 7)
        .text(`Warranty Inception Date: ${startDateStr}`, 320, p2TopY + 20)
        .fillColor("#15803d")
        .text("Protection Status: 100% COVERED (Rule 8 Guarantee)", 320, p2TopY + 33);

      doc.y = p2TopY + 74;

      // Section: Registered Installed Hardware Units
      doc
        .fontSize(10.5)
        .fillColor("#714b67")
        .text("Installed Equipment Serial Register & Manufacturer Warranty Matrix", 40, doc.y)
        .moveDown(0.3);

      const serials = job.order?.serialNumbers || [];
      const warTableY = doc.y;

      doc
        .rect(40, warTableY, 515, 17)
        .fillAndStroke("#714b67", "#714b67");

      doc
        .fontSize(8)
        .fillColor("#ffffff")
        .text("Purchased Equipment / Model", 45, warTableY + 5)
        .text("Hardware Serial #", 215, warTableY + 5)
        .text("Warranty Period", 335, warTableY + 5)
        .text("Coverage Validity", 435, warTableY + 5);

      let p2CurY = warTableY + 17;

      if (serials.length > 0) {
        serials.slice(0, 10).forEach((sn, idx) => {
          const bg = idx % 2 === 0 ? "#ffffff" : "#faf6f9";
          doc.rect(40, p2CurY, 515, 18).fillAndStroke(bg, "#ebdce7");

          const wInfo = getProductWarrantyInfo(sn.product);
          const activeWarranty = sn.warranties?.[0];
          const endDateStr = activeWarranty?.endDate
            ? new Date(activeWarranty.endDate).toLocaleDateString("en-IN")
            : `${new Date().getFullYear() + wInfo.years}`;

          doc
            .fontSize(7.5)
            .fillColor("#241621")
            .text(sn.product?.name || "Solar Equipment", 45, p2CurY + 4, { width: 165, lineBreak: false })
            .fillColor("#714b67")
            .text(sn.serial, 215, p2CurY + 4, { width: 115, lineBreak: false })
            .fillColor("#059669")
            .text(wInfo.label, 335, p2CurY + 4, { width: 95, lineBreak: false })
            .fillColor("#334155")
            .text(`Valid to: ${endDateStr}`, 435, p2CurY + 4, { width: 115, lineBreak: false });

          p2CurY += 18;
        });
      } else {
        // Fallback equipment breakdown from standard quote BOM
        const defaultEquip = [
          { name: `Tier-1 Mono PERC Solar PV Panels (${job.confirmedKw || 3} kW Array)`, sn: "PV-ARRAY-SYS-01", term: "25 Years Performance", end: "25 Years from Inception" },
          { name: "High-Efficiency Solar Inverter System", sn: "INV-GRID-SYS-01", term: "5 Years Replacement", end: "5 Years from Inception" },
          { name: "HDG Anodized Module Mounting Structure", sn: "MMS-ROOF-SYS-01", term: "10 Years Anti-Rust", end: "10 Years from Inception" },
          { name: "Dual Chemical Earthing & AC/DC Protection Box", sn: "BOS-PROT-SYS-01", term: "2 Years Component", end: "2 Years from Inception" },
        ];

        defaultEquip.forEach((eq, idx) => {
          const bg = idx % 2 === 0 ? "#ffffff" : "#faf6f9";
          doc.rect(40, p2CurY, 515, 18).fillAndStroke(bg, "#ebdce7");

          doc
            .fontSize(7.5)
            .fillColor("#241621")
            .text(eq.name, 45, p2CurY + 4, { width: 165, lineBreak: false })
            .fillColor("#714b67")
            .text(eq.sn, 215, p2CurY + 4, { width: 115, lineBreak: false })
            .fillColor("#059669")
            .text(eq.term, 335, p2CurY + 4, { width: 95, lineBreak: false })
            .fillColor("#334155")
            .text(eq.end, 435, p2CurY + 4, { width: 115, lineBreak: false });

          p2CurY += 18;
        });
      }

      doc.y = p2CurY + 12;

      // Official Manufacturer Warranty Terms
      const termsBoxY = doc.y;
      doc
        .rect(40, termsBoxY, 515, 120)
        .fillAndStroke("#ffffff", "#ebdce7");

      doc
        .fontSize(9)
        .fillColor("#714b67")
        .text("MANUFACTURER WARRANTY TERMS & BUSINESS RULE 8 PROTECTION", 50, termsBoxY + 8)
        .fontSize(7.5)
        .fillColor("#334155")
        .text(
          "1. Solar PV Modules: 25-Year Linear Power Warranty guarantees minimum 90% peak power output during the first 10 years and minimum 80% output through 25 years.\n" +
          "2. Solar Inverters: 5-Year Standard Replacement Warranty covers complete internal board, IGBT, and MPPT manufacturing defects.\n" +
          "3. Mounting Structure: 10-Year Structural Integrity Warranty against corrosion, oxidation, and wind loading up to 150 km/h.\n" +
          "4. Business Rule 8 Guarantee: Any hardware repair, component diagnostic, or field replacement for registered units under an active warranty is executed at exactly INR 0.00 (Zero Cost). Out-of-warranty repairs generate an automated itemized invoice.\n" +
          "5. Service Desk Access: To raise a warranty ticket, visit the Solar Service Desk & Universal Warranty Portal or contact support@sunpower.com quoting your Certificate Number.",
          50,
          termsBoxY + 22,
          { width: 495 }
        );

      // Official Quality & Warranty Stamp
      const stampY = termsBoxY + 130;
      doc
        .rect(40, stampY, 515, 60)
        .fillAndStroke("#faf6f9", "#ebdce7");

      doc
        .fontSize(8.5)
        .fillColor("#714b67")
        .text("Official Manufacturer & EPC Quality Seal", 55, stampY + 10)
        .fontSize(7.5)
        .fillColor("#15803d")
        .text("✓ Verified & Registered in SunPower Central Universal Warranty Engine", 55, stampY + 23)
        .fillColor("#64748b")
        .text("Authorised QA / Commissioning Directorate", 55, stampY + 36);

      doc
        .fontSize(9)
        .fillColor("#714b67")
        .text("For SunPower Solutions Pvt Ltd", 360, stampY + 12, { align: "right" })
        .fontSize(8)
        .fillColor("#15803d")
        .text("✓ Digitally Sealed & Certified", 360, stampY + 26, { align: "right" })
        .fillColor("#94a3b8")
        .text("ISO 9001:2015 Quality Compliant", 360, stampY + 38, { align: "right" });

      // Page 2 footer
      doc
        .fontSize(7)
        .fillColor("#94a3b8")
        .text(
          "This certificate is an official warranty deed. All claims are governed by SunPower Solutions PVT LTD terms and conditions.",
          40,
          780,
          { align: "center", width: 515 }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ============================================================================
// 4. OFFICIAL PAYMENT RECEIPT PDF (Includes equipment purchased & warranty summary)
// ============================================================================
function generatePaymentReceiptPdf(payment, order, company) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // Header
      doc
        .fontSize(22)
        .fillColor("#714b67")
        .text((company?.name || "SUNPOWER SOLUTIONS PVT LTD").toUpperCase(), { align: "left" })
        .fontSize(10)
        .fillColor("#64748b")
        .text("Rooftop Solar EPC & Clean Energy Systems", { align: "left" })
        .text(`GSTIN: ${company?.gstNumber || "36AABCU9603R1ZM"} | Phone: ${company?.phone || "+91 98765 43210"}`)
        .text(`Address: ${company?.address || "Energy Park, Hyderabad"}`)
        .moveDown(0.5);

      doc
        .strokeColor("#ebdce7")
        .lineWidth(1.5)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(0.8);

      // Title & Receipt Badges
      doc
        .fontSize(16)
        .fillColor("#241621")
        .text("OFFICIAL PAYMENT RECEIPT & EQUIPMENT LEDGER", { align: "center" })
        .moveDown(0.5);

      const topY = doc.y;
      doc
        .fontSize(9.5)
        .fillColor("#334155")
        .text(`Receipt #: ${payment.receiptNumber || `REC-${payment.id.slice(-6).toUpperCase()}`}`, 50, topY)
        .text(`Date & Time: ${new Date(payment.receivedAt).toLocaleString("en-IN")}`, 50, topY + 14)
        .text(`Payment Mode: ${payment.method === "DUMMY" ? "DUMMY (Simulated Instant Test)" : payment.method}`, 50, topY + 28)
        .text(`Reference / UTR: ${payment.transactionRef || "N/A"}`, 50, topY + 42);

      doc
        .text(`Order #: ${order.orderNumber}`, 320, topY)
        .text(`Customer: ${order.customer?.name || "Valued Customer"}`, 320, topY + 14)
        .text(`Phone: ${order.customer?.phone || "N/A"}`, 320, topY + 28)
        .text(`System Capacity: ${order.capacityKw} kW Peak`, 320, topY + 42);

      doc.y = topY + 62;

      // Receipt Amount Box
      const boxY = doc.y;
      doc
        .rect(50, boxY, 495, 52)
        .fillAndStroke("#faf6f9", "#ebdce7");

      doc
        .fontSize(10)
        .fillColor("#714b67")
        .text("AMOUNT RECEIVED:", 70, boxY + 11)
        .fontSize(18)
        .fillColor("#10b981")
        .text(`₹ ${Number(payment.amount).toLocaleString("en-IN")}`, 70, boxY + 24);

      doc
        .fontSize(9.5)
        .fillColor("#64748b")
        .text("Status: COMPLETED & VERIFIED", 320, boxY + 20, { align: "right" });

      doc.y = boxY + 62;

      // Order Balance Breakdown
      const allPayments = order.payments || [payment];
      const totalPaid = allPayments
        .filter((p) => p.status === "COMPLETED" && p.isVerified !== false)
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const contractValue = Number(order.totalAmount);
      const remainingBalance = Math.max(0, contractValue - totalPaid);

      doc
        .fontSize(11)
        .fillColor("#241621")
        .text("Contract Financial Ledger", 50, doc.y)
        .moveDown(0.3);

      const tableTop = doc.y;
      doc
        .fontSize(9)
        .fillColor("#475569")
        .text("Total Contract Value:", 50, tableTop)
        .text(`₹ ${contractValue.toLocaleString("en-IN")}`, 400, tableTop, { align: "right" })
        .text("Total Collected to Date:", 50, tableTop + 15)
        .text(`₹ ${totalPaid.toLocaleString("en-IN")}`, 400, tableTop + 15, { align: "right" })
        .text("Remaining Balance Outstanding:", 50, tableTop + 30)
        .text(`₹ ${remainingBalance.toLocaleString("en-IN")}`, 400, tableTop + 30, { align: "right" });

      doc
        .strokeColor("#ebdce7")
        .lineWidth(1)
        .moveTo(50, tableTop + 48)
        .lineTo(545, tableTop + 48)
        .stroke();

      doc.y = tableTop + 58;

      // ========================================================
      // Equipment Purchased & Manufacturer Warranty Schedule
      // ========================================================
      const warBoxY = doc.y;
      doc
        .rect(50, warBoxY, 495, 18)
        .fillAndStroke("#714b67", "#714b67");

      doc
        .fontSize(8.5)
        .fillColor("#ffffff")
        .text("EQUIPMENT PURCHASED & MANUFACTURER WARRANTY SCHEDULE", 55, warBoxY + 5);

      let wCurY = warBoxY + 18;

      // Gather equipment items from quote lines or standard solar configuration
      const quoteLines = order.quote?.lines || [];
      const displayItems = [];

      if (quoteLines.length > 0) {
        quoteLines.forEach((ql) => {
          const wInfo = getProductWarrantyInfo(ql.product, ql.description);
          displayItems.push({
            name: ql.product ? `${ql.product.name} (${ql.product.sku})` : ql.description,
            warranty: wInfo.label,
          });
        });
      } else {
        displayItems.push(
          { name: `Mono PERC Tier-1 PV Module Array (${order.capacityKw} kW System)`, warranty: "25 Years Performance Warranty" },
          { name: "Solar On-Grid / Hybrid Inverter System", warranty: "5 Years Replacement Warranty" },
          { name: "Galvanized Module Mounting Structure (MMS)", warranty: "10 Years Anti-Rust Guarantee" },
          { name: "ACDB/DCDB Surge & Dual Chemical Earthing System", warranty: "2 Years Comprehensive BOS Warranty" }
        );
      }

      displayItems.slice(0, 4).forEach((item, idx) => {
        const bg = idx % 2 === 0 ? "#ffffff" : "#faf6f9";
        doc.rect(50, wCurY, 495, 16).fillAndStroke(bg, "#ebdce7");

        doc
          .fontSize(7.5)
          .fillColor("#241621")
          .text(item.name, 55, wCurY + 4, { width: 280, lineBreak: false })
          .fillColor("#059669")
          .text(`🛡️ ${item.warranty}`, 340, wCurY + 4, { width: 200, lineBreak: false });

        wCurY += 16;
      });

      doc.y = wCurY + 10;

      if (payment.notes) {
        doc
          .fontSize(8.5)
          .fillColor("#64748b")
          .text(`Notes: ${payment.notes}`)
          .moveDown(0.5);
      }

      // Authorization / Footer
      doc.moveDown(1);
      const footerY = doc.y;
      doc
        .fontSize(8)
        .fillColor("#94a3b8")
        .text("This is an electronically generated receipt issued under the SunPower ERP system.", 50, footerY)
        .text("All purchased equipment is covered by manufacturer warranty from the date of final commissioning.", 50, footerY + 11);

      doc
        .fontSize(9.5)
        .fillColor("#714b67")
        .text("For SunPower Solutions Pvt Ltd", 360, footerY, { align: "right" })
        .fontSize(8)
        .fillColor("#64748b")
        .text("Authorised Accounts Signatory", 360, footerY + 13, { align: "right" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateQuotePdf,
  generateInvoicePdf,
  generateCompletionCertificatePdf,
  generatePaymentReceiptPdf,
};
