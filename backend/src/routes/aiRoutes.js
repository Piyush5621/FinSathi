import express from "express";
import { AIService } from "../services/AIService.js";
import { supabase } from "../config/db.js";
import { successResponse, errorResponse } from "../utils/responseHelper.js";

const router = express.Router();

/**
 * POST /api/ai/query
 * Body: { query: string }
 * User types or speaks a business query in Hindi/Hinglish/English.
 */
router.post("/query", async (req, res) => {
  try {
    const userId = req.user.id;
    const { query } = req.body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return errorResponse(res, "Query is required.", 400);
    }

    if (query.trim().length > 500) {
      return errorResponse(res, "Query too long. Max 500 characters.", 400);
    }

    // Build context: business name, top customers, products
    const [{ data: user }, { data: customers }, { data: products }] = await Promise.all([
      supabase.from("users").select("name, business_name").eq("id", userId).single(),
      supabase.from("customers").select("name").eq("user_id", userId).limit(10),
      supabase.from("inventory").select("name").eq("user_id", userId).limit(10),
    ]);

    const context = {
      businessName: user?.business_name || user?.name || "your business",
      customers: (customers || []).map((c) => c.name),
      categories: (products || []).map((p) => p.name),
    };

    const result = await AIService.query(userId, query.trim(), context);

    return successResponse(res, result, "AI processing complete");
  } catch (err) {
    console.error("AI query route error:", err);
    return errorResponse(res, err, 500, "AI Assistant could not process this query");
  }
});

export default router;
