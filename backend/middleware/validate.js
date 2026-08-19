export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error.errors) {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: formattedErrors,
      });
    }
    return res.status(400).json({ success: false, message: "Invalid request payload" });
  }
};
