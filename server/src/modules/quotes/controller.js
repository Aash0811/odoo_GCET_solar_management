const quotesService = require("./service");

async function listQuotes(req, res, next) {
  try {
    const quotes = await quotesService.getQuotes(req.companyId, req.query, req.user?.role);
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
    const quote = await quotesService.getQuoteById(req.companyId, req.params.id, req.user?.role);
    return res.status(200).json({
      success: true,
      data: quote,
    });
  } catch (error) {
    next(error);
  }
}

async function getSharedQuote(req, res, next) {
  try {
    const quote = await quotesService.getQuoteByShareToken(req.params.token);
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
    const quote = await quotesService.createQuote(req.companyId, req.body, req.user?.id, req);
    return res.status(201).json({
      success: true,
      message: `Quote ${quote.quoteNumber} (v${quote.version}) created.`,
      data: quote,
    });
  } catch (error) {
    next(error);
  }
}

async function updateQuoteLines(req, res, next) {
  try {
    const quote = await quotesService.updateQuoteLines(req.companyId, req.params.id, req.body, req.user?.id, req);
    return res.status(200).json({
      success: true,
      message: `Quote ${quote.quoteNumber} updated to version v${quote.version}.`,
      data: quote,
    });
  } catch (error) {
    next(error);
  }
}

async function approveDiscount(req, res, next) {
  try {
    const quote = await quotesService.reviewDiscount(req.companyId, req.params.id, req.body, req.user?.id, req);
    return res.status(200).json({
      success: true,
      message: req.body.approved ? "Discount approved successfully." : "Discount request rejected.",
      data: quote,
    });
  } catch (error) {
    next(error);
  }
}

async function acceptQuote(req, res, next) {
  try {
    const quote = await quotesService.acceptQuote(req.companyId, req.params.id, req.body, req);
    return res.status(200).json({
      success: true,
      message: "Quotation accepted online! Digital acceptance record created.",
      data: quote,
    });
  } catch (error) {
    next(error);
  }
}

async function acceptSharedQuote(req, res, next) {
  try {
    const quote = await quotesService.acceptQuote(null, req.params.token, req.body, req);
    return res.status(200).json({
      success: true,
      message: "Quotation accepted online! Digital acceptance record created.",
      data: quote,
    });
  } catch (error) {
    next(error);
  }
}

async function rejectQuote(req, res, next) {
  try {
    const quote = await quotesService.rejectQuote(req.companyId, req.params.id, req.body, req);
    return res.status(200).json({
      success: true,
      message: "Quotation marked as rejected.",
      data: quote,
    });
  } catch (error) {
    next(error);
  }
}

async function rejectSharedQuote(req, res, next) {
  try {
    const quote = await quotesService.rejectQuote(null, req.params.token, req.body, req);
    return res.status(200).json({
      success: true,
      message: "Quotation marked as rejected.",
      data: quote,
    });
  } catch (error) {
    next(error);
  }
}

async function updateQuoteStatus(req, res, next) {
  try {
    const quote = await quotesService.updateQuoteStatus(req.companyId, req.params.id, req.body.status, req.user?.id, req);
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

async function uploadQuotePhoto(req, res, next) {
  try {
    const photos = await quotesService.uploadQuotePhoto(
      req.companyId,
      req.params.id,
      req.files,
      req.body.caption,
      req.body.phase,
      req.user.id,
      req
    );
    return res.status(201).json({ success: true, message: "Photos uploaded successfully.", data: photos });
  } catch (error) {
    next(error);
  }
}

async function listQuotePhotos(req, res, next) {
  try {
    const photos = await quotesService.getQuotePhotos(req.companyId, req.params.id);
    return res.status(200).json({ success: true, data: photos });
  } catch (error) {
    next(error);
  }
}

async function deleteQuotePhoto(req, res, next) {
  try {
    await quotesService.deleteQuotePhoto(
      req.companyId,
      req.params.id,
      req.params.photoId,
      req.user.id,
      req
    );
    return res.status(200).json({ success: true, message: "Photo deleted." });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listQuotes,
  getQuote,
  getSharedQuote,
  createQuote,
  updateQuoteLines,
  approveDiscount,
  acceptQuote,
  acceptSharedQuote,
  rejectQuote,
  rejectSharedQuote,
  updateQuoteStatus,
  downloadQuotePdf,
  uploadQuotePhoto,
  listQuotePhotos,
  deleteQuotePhoto,
};
