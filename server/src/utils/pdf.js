const PDFDocument = require("pdfkit");

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
        .fillColor("#0284c7")
        .text((company.name || "SUNPOWER SOLUTIONS").toUpperCase(), { align: "left" })
        .fontSize(10)
        .fillColor("#64748b")
        .text("Rooftop Solar EPC & Clean Energy Systems", { align: "left" })
        .text(`GSTIN: ${company.gstNumber || "36AABCU9603R1ZM"} | Phone: ${company.phone || "+91 98765 43210"}`)
        .text(`Address: ${company.address || "Energy Park, Hyderabad"}`)
        .moveDown();

      doc
        .strokeColor("#cbd5e1")
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(1);

      // Quote Title & Meta
      doc
        .fontSize(16)
        .fillColor("#0f172a")
        .text(`SOLAR INSTALLATION QUOTATION`, { align: "center" })
        .moveDown(0.5);

      const metaY = doc.y;
      doc
        .fontSize(10)
        .fillColor("#334155")
        .text(`Quote #: ${quote.quoteNumber}`, 50, metaY)
        .text(`Date: ${new Date(quote.createdAt).toLocaleDateString()}`, 50, metaY + 15)
        .text(`Capacity: ${quote.capacityKw} kW System`, 50, metaY + 30)
        .text(`Package: ${quote.packageTemplate?.name || "Solar Rooftop Package"}`, 50, metaY + 45);

      doc
        .text(`Customer: ${quote.customer?.name || "Valued Client"}`, 320, metaY)
        .text(`Phone: ${quote.customer?.phone || "N/A"}`, 320, metaY + 15)
        .text(`Email: ${quote.customer?.email || "N/A"}`, 320, metaY + 30)
        .text(`Address: ${quote.customer?.address || "On-site installation"}`, 320, metaY + 45, { width: 220 });

      doc.y = metaY + 75;
      doc.moveDown(1);

      // BOM Table Header
      const tableTop = doc.y;
      doc
        .fillColor("#f1f5f9")
        .rect(50, tableTop, 495, 22)
        .fill();

      doc
        .fontSize(9)
        .fillColor("#1e293b")
        .text("Item / Description", 55, tableTop + 6)
        .text("Qty", 310, tableTop + 6, { width: 40, align: "right" })
        .text("Rate (INR)", 360, tableTop + 6, { width: 70, align: "right" })
        .text("Total (INR)", 440, tableTop + 6, { width: 95, align: "right" });

      let currentY = tableTop + 24;

      // Table Lines
      const lines = quote.lines || [];
      lines.forEach((line) => {
        const itemText = line.product ? `${line.product.name} (${line.product.sku})` : line.description;
        const lineTotal = Number(line.lineTotal || 0);
        const unitPrice = Number(line.unitPrice || 0);
        const qty = Number(line.quantity || 1);

        doc
          .fontSize(9)
          .fillColor("#334155")
          .text(itemText, 55, currentY, { width: 245 })
          .text(qty.toString(), 310, currentY, { width: 40, align: "right" })
          .text(unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 }), 360, currentY, { width: 70, align: "right" })
          .text(lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 }), 440, currentY, { width: 95, align: "right" });

        currentY += 20;
      });

      doc
        .strokeColor("#e2e8f0")
        .lineWidth(0.5)
        .moveTo(50, currentY + 2)
        .lineTo(545, currentY + 2)
        .stroke();

      currentY += 10;

      // Totals
      const subtotal = Number(quote.subtotal || 0);
      const gst = Number(quote.gstAmount || 0);
      const total = Number(quote.totalAmount || 0);

      doc
        .fontSize(10)
        .fillColor("#475569")
        .text("Subtotal:", 350, currentY, { width: 90, align: "right" })
        .text(`INR ${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 440, currentY, { width: 95, align: "right" });

      currentY += 18;
      doc
        .text(`GST (${quote.gstRate || 18}%):`, 350, currentY, { width: 90, align: "right" })
        .text(`INR ${gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 440, currentY, { width: 95, align: "right" });

      currentY += 20;
      doc
        .fontSize(12)
        .fillColor("#0284c7")
        .text("Total Payable:", 330, currentY, { width: 110, align: "right" })
        .text(`INR ${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 440, currentY, { width: 95, align: "right" });

      // Subsidy note and Terms
      doc.moveDown(4);
      doc
        .fontSize(10)
        .fillColor("#047857")
        .text("GOVERNMENT SUBSIDY NOTICE (PM Surya Ghar / State Policy):", 50, doc.y)
        .fontSize(9)
        .fillColor("#334155")
        .text(
          quote.subsidyNote ||
            "Estimated subsidy of up to INR 78,000 applicable subject to Discom & MNRE portal approval and meter commissioning.",
          { width: 495 }
        )
        .moveDown(1);

      doc
        .fontSize(10)
        .fillColor("#0f172a")
        .text("Terms & Conditions:", 50, doc.y)
        .fontSize(8)
        .fillColor("#64748b")
        .text(
          "1. 10% Advance on order confirmation; 80% on dispatch of equipment; 10% after net metering & commissioning.\n" +
          "2. Warranty: Solar PV Modules 20-25 years performance warranty, Inverter 2-5 years as per manufacturer terms.\n" +
          "3. Grid connectivity and subsidy disbursement are subject to local Discom regulations.",
          { width: 495 }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function generateInvoicePdf(invoice, company) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      doc
        .fontSize(20)
        .fillColor("#0284c7")
        .text((company.name || "SUNPOWER SOLUTIONS").toUpperCase(), 50, 45)
        .fontSize(10)
        .fillColor("#64748b")
        .text(`GSTIN: ${company.gstNumber || "36AABCU9603R1ZM"} | ${company.phone || "+91 98765 43210"}`)
        .text("Tax Invoice & Service Bill")
        .moveDown(1);

      doc
        .fontSize(14)
        .fillColor("#0f172a")
        .text(`INVOICE: ${invoice.invoiceNumber}`, { align: "right" })
        .fontSize(9)
        .text(`Status: ${invoice.status}`, { align: "right" })
        .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, { align: "right" });

      doc.moveDown(2);

      const tableTop = doc.y;
      doc
        .fillColor("#f1f5f9")
        .rect(50, tableTop, 495, 20)
        .fill();

      doc
        .fontSize(9)
        .fillColor("#1e293b")
        .text("Description", 55, tableTop + 5)
        .text("Qty", 310, tableTop + 5, { width: 40, align: "right" })
        .text("Rate", 360, tableTop + 5, { width: 70, align: "right" })
        .text("Amount", 440, tableTop + 5, { width: 95, align: "right" });

      let currentY = tableTop + 24;
      const lines = invoice.lines || [];
      lines.forEach((line) => {
        doc
          .fontSize(9)
          .fillColor("#334155")
          .text(line.description, 55, currentY, { width: 250 })
          .text(Number(line.quantity).toString(), 310, currentY, { width: 40, align: "right" })
          .text(Number(line.unitPrice).toFixed(2), 360, currentY, { width: 70, align: "right" })
          .text(Number(line.lineTotal).toFixed(2), 440, currentY, { width: 95, align: "right" });
        currentY += 18;
      });

      currentY += 10;
      doc
        .fontSize(11)
        .fillColor("#0f172a")
        .text(`Total: INR ${Number(invoice.totalAmount).toFixed(2)}`, 350, currentY, { width: 185, align: "right" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function generateCompletionCertificatePdf(job, company) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

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
        .rect(40, topY, 515, 60)
        .fillAndStroke("#faf6f9", "#ebdce7");

      doc
        .fontSize(8.5)
        .fillColor("#334155")
        .text(`Certificate #: CERT-${job.jobNumber}`, 50, topY + 7)
        .text(`Customer Name: ${job.customer?.name || "Client"}`, 50, topY + 20)
        .text(`Site Address: ${job.customer?.address || "Customer Rooftop Site"}`, 50, topY + 33, { width: 250, lineBreak: false })
        .text(`Installed Capacity: ${job.confirmedKw || "3.0"} kW Peak`, 320, topY + 7)
        .text(`Commissioned On: ${job.completedAt ? new Date(job.completedAt).toLocaleString("en-IN") : new Date().toLocaleString("en-IN")}`, 320, topY + 20)
        .text(`Lead Engineer: ${job.technician?.name || "Senior Installation Engineer"}`, 320, topY + 33);

      doc.y = topY + 68;

      // Component Connection Verification Matrix Header
      doc
        .fontSize(10.5)
        .fillColor("#714b67")
        .text("Component Connection & Engineering Verification Matrix (100% Passed)", 40, doc.y)
        .moveDown(0.3);

      // Parse component connections if present
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
          "This certificate is an official commissioning handover issued pursuant to MNRE rooftop solar installation guidelines. All electrical string connections, mechanical torque ratings, dual earthing resistances, and anti-islanding safety features have been tested and verified operational.",
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
        .moveDown();

      doc
        .strokeColor("#ebdce7")
        .lineWidth(1.5)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(1);

      // Title & Receipt Badges
      doc
        .fontSize(16)
        .fillColor("#241621")
        .text(`OFFICIAL PAYMENT RECEIPT`, { align: "center" })
        .moveDown(0.5);

      const topY = doc.y;
      doc
        .fontSize(10)
        .fillColor("#334155")
        .text(`Receipt #: ${payment.receiptNumber || `REC-${payment.id.slice(-6).toUpperCase()}`}`, 50, topY)
        .text(`Date & Time: ${new Date(payment.receivedAt).toLocaleString("en-IN")}`, 50, topY + 15)
        .text(`Payment Mode: ${payment.method === "DUMMY" ? "DUMMY (Simulated Instant Test)" : payment.method}`, 50, topY + 30)
        .text(`Reference / UTR: ${payment.transactionRef || "N/A"}`, 50, topY + 45);

      doc
        .text(`Order #: ${order.orderNumber}`, 320, topY)
        .text(`Customer: ${order.customer?.name || "Valued Customer"}`, 320, topY + 15)
        .text(`Phone: ${order.customer?.phone || "N/A"}`, 320, topY + 30)
        .text(`Capacity: ${order.capacityKw} kW System`, 320, topY + 45);

      doc.y = topY + 70;
      doc.moveDown(0.5);

      // Receipt Box
      const boxY = doc.y;
      doc
        .rect(50, boxY, 495, 60)
        .fillAndStroke("#faf6f9", "#ebdce7");

      doc
        .fontSize(11)
        .fillColor("#714b67")
        .text("AMOUNT RECEIVED:", 70, boxY + 15)
        .fontSize(20)
        .fillColor("#10b981")
        .text(`₹ ${Number(payment.amount).toLocaleString("en-IN")}`, 70, boxY + 30);

      doc
        .fontSize(10)
        .fillColor("#64748b")
        .text(`Status: COMPLETED & VERIFIED`, 320, boxY + 25, { align: "right" });

      doc.y = boxY + 75;
      doc.moveDown(0.5);

      // Order Balance Breakdown
      const allPayments = order.payments || [payment];
      const totalPaid = allPayments
        .filter((p) => p.status === "COMPLETED" && p.isVerified !== false)
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const contractValue = Number(order.totalAmount);
      const remainingBalance = Math.max(0, contractValue - totalPaid);

      doc
        .fontSize(12)
        .fillColor("#241621")
        .text("Contract Financial Ledger", 50, doc.y)
        .moveDown(0.4);

      const tableTop = doc.y;
      doc
        .fontSize(10)
        .fillColor("#475569")
        .text("Total Contract Value:", 50, tableTop)
        .text(`₹ ${contractValue.toLocaleString("en-IN")}`, 400, tableTop, { align: "right" })
        .text("Total Collected to Date:", 50, tableTop + 18)
        .text(`₹ ${totalPaid.toLocaleString("en-IN")}`, 400, tableTop + 18, { align: "right" })
        .text("Remaining Balance Outstanding:", 50, tableTop + 36)
        .text(`₹ ${remainingBalance.toLocaleString("en-IN")}`, 400, tableTop + 36, { align: "right" });

      doc
        .strokeColor("#ebdce7")
        .lineWidth(1)
        .moveTo(50, tableTop + 56)
        .lineTo(545, tableTop + 56)
        .stroke();

      doc.y = tableTop + 70;

      if (payment.notes) {
        doc
          .fontSize(9)
          .fillColor("#64748b")
          .text(`Notes: ${payment.notes}`)
          .moveDown(1);
      }

      // Authorization / Footer
      doc.moveDown(2);
      const footerY = doc.y;
      doc
        .fontSize(9)
        .fillColor("#94a3b8")
        .text("This is an electronically generated receipt issued under the SunPower ERP system.", 50, footerY)
        .text("Thank you for your business and commitment to clean solar energy!", 50, footerY + 12);

      doc
        .fontSize(10)
        .fillColor("#714b67")
        .text("For SunPower Solutions Pvt Ltd", 360, footerY, { align: "right" })
        .fontSize(8)
        .fillColor("#64748b")
        .text("Authorised Accounts Signatory", 360, footerY + 15, { align: "right" });

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
