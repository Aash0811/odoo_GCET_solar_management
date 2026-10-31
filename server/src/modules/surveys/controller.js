const surveysService = require("./service");

async function listSurveys(req, res, next) {
  try {
    const surveys = await surveysService.getSurveys(req.companyId, req.query);
    return res.status(200).json({
      success: true,
      data: surveys,
    });
  } catch (error) {
    next(error);
  }
}

async function getSurvey(req, res, next) {
  try {
    const survey = await surveysService.getSurveyById(req.companyId, req.params.id);
    return res.status(200).json({
      success: true,
      data: survey,
    });
  } catch (error) {
    next(error);
  }
}

async function scheduleSurvey(req, res, next) {
  try {
    const survey = await surveysService.scheduleSurvey(req.companyId, req.body, req.user.id, req);
    return res.status(201).json({
      success: true,
      message: "Survey scheduled successfully.",
      data: survey,
    });
  } catch (error) {
    next(error);
  }
}

async function submitSurvey(req, res, next) {
  try {
    // Multer populates req.files
    const files = req.files || [];
    const updated = await surveysService.submitSurvey(
      req.companyId,
      req.params.id,
      req.body,
      files,
      req.user.id,
      req
    );

    return res.status(200).json({
      success: true,
      message: "Survey submitted successfully with photos.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function reviewSurvey(req, res, next) {
  try {
    const updated = await surveysService.reviewSurvey(
      req.companyId,
      req.params.id,
      req.body,
      req.user.id,
      req
    );

    return res.status(200).json({
      success: true,
      message: `Survey marked as ${updated.status}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listSurveys,
  getSurvey,
  scheduleSurvey,
  submitSurvey,
  reviewSurvey,
};
