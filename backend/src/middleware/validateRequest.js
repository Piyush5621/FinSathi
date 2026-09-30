import { z } from "zod";

export const validateRequest = (schema) => (req, res, next) => {
  try {
    // We can validate body, query, and params if the schema is defined that way
    // For simplicity, we assume schema is for req.body
    if (schema.body) {
       schema.body.parse(req.body);
    } else {
       schema.parse(req.body); 
    }
    next();
  } catch (error) {
    console.error("Validation Middleware Error:", error);
    if (error instanceof z.ZodError || error.name === "ZodError") {
      const issues = Array.isArray(error.errors) ? error.errors : (Array.isArray(error.issues) ? error.issues : []);
      const formattedErrors = issues.map((e) => ({
        field: Array.isArray(e.path) ? e.path.join(".") : String(e.path || ""),
        message: e.message,
      }));
      const firstError = formattedErrors[0]?.message || "Validation failed";
      return res.status(400).json({
        message: "Validation failed",
        error: firstError,
        errors: formattedErrors,
      });
    }
    return res.status(400).json({ message: "Validation failed", error: error.message || "Invalid input data" });
  }

};
