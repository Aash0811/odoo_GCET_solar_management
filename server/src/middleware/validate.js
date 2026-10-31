function validate(schema, source = "body") {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const result = schema.safeParse(dataToValidate);

      if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));

        return res.status(400).json({
          success: false,
          message: "Validation failed: " + errors.map((e) => `${e.field}: ${e.message}`).join(", "),
          errors,
        });
      }

      req[source] = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = validate;
