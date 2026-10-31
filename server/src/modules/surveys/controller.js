const surveysService = require("./service");

async function listSurveys(req, res, next) {
  try {
    const surveys = await surveysService.getSurveys(req.companyId, req.query, req.user);
    return res.status(200).json({
      success: true,
      data: surveys,
      pagination: surveys.pagination || null,
    });
  } catch (error) {
    next(error);
  }
}

async function getTechnicians(req, res, next) {
  try {
    const technicians = await surveysService.getTechnicians(req.companyId);
    return res.status(200).json({
      success: true,
      data: technicians,
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
      message: "Survey scheduled successfully and technician notified.",
      data: survey,
    });
  } catch (error) {
    next(error);
  }
}

async function submitSurvey(req, res, next) {
  try {
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
  getTechnicians,
  getSurvey,
  scheduleSurvey,
  submitSurvey,
  reviewSurvey,
};
