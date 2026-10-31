function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.publicMessage || err.message || "Internal server error";

  // Zod validation errors.
  if (err.name === "ZodError") {
    statusCode = 400;
    message = "Validation failed";

    return res.status(statusCode).json({
      success: false,
      message,
      errors: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  // Prisma errors.
  if (err.code === "P2002") {
    statusCode = 409;
    message = "A record with this unique value already exists.";
  } else if (err.code === "P2025") {
    statusCode = 404;
    message = "The requested database record was not found.";
  } else if (err.code === "P2003") {
    statusCode = 400;
    message = "The operation references an invalid related record.";
  }

  if (statusCode < 400 || statusCode > 599) {
    statusCode = 500;
  }

  if (statusCode >= 500) {
    console.error({
      message: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method
    });

    if (process.env.NODE_ENV === "production") {
      message =
        err.publicMessage || "An unexpected server error occurred.";
    }
  }

  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && statusCode >= 500
      ? { debugMessage: err.message }
      : {})
  });
}

module.exports = errorHandler;