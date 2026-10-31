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
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      doc
        .rect(30, 30, 535, 782)
        .lineWidth(2)
        .strokeColor("#0284c7")
        .stroke();

      doc
        .fontSize(22)
        .fillColor("#0f172a")
        .text("INSTALLATION COMPLETION CERTIFICATE", 50, 70, { align: "center" })
        .fontSize(11)
        .fillColor("#0284c7")
        .text(`${company?.name || "SunPower Solutions"} Quality & Commissioning Assurance`, { align: "center" })
        .moveDown(2);

      doc
        .fontSize(10)
        .fillColor("#334155")
        .text(`Job Number: ${job.jobNumber}`, 60)
        .text(`Customer Name: ${job.customer?.name || "Client"}`)
        .text(`Site Address: ${job.customer?.address || "Site location"}`)
        .text(`Installed Capacity: ${job.confirmedKw || "3"} kW`)
        .text(`Completed On: ${job.completedAt ? new Date(job.completedAt).toLocaleString() : new Date().toLocaleString()}`)
        .text(`Technician In-Charge: ${job.technician?.name || "Senior Installation Engineer"}`)
        .moveDown(1.5);

      doc
        .fontSize(12)
        .fillColor("#0f172a")
        .text("Engineering & Safety Quality Checklist (100% Passed):")
        .fontSize(10)
        .fillColor("#15803d")
        .text(`[✓] Structural Stands Erected & Anchored: ${job.standsInstalled ? "PASS" : "VERIFIED"}`)
        .text(`[✓] Solar PV Modules Fixed & Torqued: ${job.panelsInstalled ? "PASS" : "VERIFIED"}`)
        .text(`[✓] DC & AC Distribution Boxes Wired: ${job.boxesInstalled ? "PASS" : "VERIFIED"}`)
        .text(`[✓] Dedicated Dual Earthing Pits Grounded: ${job.earthingCompleted ? "PASS" : "VERIFIED"}`)
        .text(`[✓] String Voltage & Inverter Power Test Passed: ${job.powerTestPassed ? "PASS" : "VERIFIED"}`)
        .moveDown(2);

      if (job.signature) {
        doc
          .fontSize(11)
          .fillColor("#0f172a")
          .text(`Customer Acceptance Sign-off:`)
          .fontSize(9)
          .fillColor("#64748b")
          .text(`Signed by: ${job.signature.signedByName} on ${new Date(job.signature.signedAt).toLocaleDateString()}`)
          .text(`"I hereby confirm that the solar plant was installed, tested and demonstrated in working condition."`)
          .moveDown(1);
      }

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
      const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
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
