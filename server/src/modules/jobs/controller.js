const jobsService = require("./service");

async function listJobs(req, res, next) {
  try {
    const jobs = await jobsService.getJobs(req.companyId, req.query, req.user);
    return res.status(200).json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    next(error);
  }
}

async function getJob(req, res, next) {
  try {
    const job = await jobsService.getJobById(req.companyId, req.params.id, req.user);
    return res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
}

async function updateJobProgress(req, res, next) {
  try {
    const job = await jobsService.updateJobProgress(
      req.companyId,
      req.params.id,
      req.body,
      req.user.id,
      req,
      req.user
    );
    return res.status(200).json({
      success: true,
      message: "Job progress updated.",
      data: job,
    });
  } catch (error) {
    next(error);
  }
}

async function uploadPhoto(req, res, next) {
  try {
    const files = req.files?.photos || req.files?.photo || (req.file ? [req.file] : []);
    const photo = await jobsService.uploadJobPhoto(
      req.companyId,
      req.params.id,
      files,
      req.body.caption,
      req.user.id,
      req,
      req.user
    );
    return res.status(201).json({
      success: true,
      message: "Job photo(s) uploaded successfully.",
      data: photo,
    });
  } catch (error) {
    next(error);
  }
}

async function completeJob(req, res, next) {
  try {
    const files = req.files || {};
    const job = await jobsService.completeJob(
      req.companyId,
      req.params.id,
      req.body,
      files,
      req.user.id,
      req,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: `Installation job ${job.jobNumber} marked as COMPLETED! Certificate generated.`,
      data: job,
    });
  } catch (error) {
    next(error);
  }
}

async function downloadCertificate(req, res, next) {
  try {
    const buffer = await jobsService.getJobCertificatePdf(req.companyId, req.params.id, req.user);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=certificate-${req.params.id}.pdf`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listJobs,
  getJob,
  updateJobProgress,
  uploadPhoto,
  completeJob,
  downloadCertificate,
};
