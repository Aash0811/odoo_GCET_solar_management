const quotesService = require("./service");

async function listQuotes(req, res, next) {
  try {
    const quotes = await quotesService.getQuotes(req.companyId, req.query);
    return res.status(200).json({
      success: true,
      data: quotes,
    });
  } catch (error) {
    next(error);
  }
}

async function getQuote(req, res, next) {
  try {
    const quote = await quotesService.getQuoteById(req.companyId, req.params.id);
    return res.status(200).json({
      success: true,
      data: quote,
    });
  } catch (error) {
    next(error);
  }
}

async function createQuote(req, res, next) {
  try {
    const quote = await quotesService.createQuote(req.companyId, req.body, req.user.id, req);
    return res.status(201).json({
      success: true,
      message: `Quote ${quote.quoteNumber} created with auto-expanded BOM lines.`,
      data: quote,
    });
  } catch (error) {
    next(error);
  }
}

async function updateQuoteStatus(req, res, next) {
  try {
    const quote = await quotesService.updateQuoteStatus(req.companyId, req.params.id, req.body.status, req.user.id, req);
    return res.status(200).json({
      success: true,
      message: `Quote status updated to ${quote.status}.`,
      data: quote,
    });
  } catch (error) {
    next(error);
  }
}

async function downloadQuotePdf(req, res, next) {
  try {
    const buffer = await quotesService.getQuotePdfBuffer(req.companyId, req.params.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=quote-${req.params.id}.pdf`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listQuotes,
  getQuote,
  createQuote,
  updateQuoteStatus,
  downloadQuotePdf,
};
