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
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
    return res.status(500).json({ message: "Internal validation error", details: error.message });
  }
};
