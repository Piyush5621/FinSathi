import { supabase } from "../config/db.js";

/**
 * NetworkService — Core helpers for Business Network module
 * Includes fuzzy product matching + network notification push
 */

// Compute Levenshtein distance between two strings (for fuzzy name matching)
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0).map((_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// Similarity ratio: 1.0 = identical, 0.0 = completely different
function similarityScore(a, b) {
  if (!a || !b) return 0;
  const aLow = a.toLowerCase().trim();
  const bLow = b.toLowerCase().trim();
  if (aLow === bLow) return 1.0;
  const maxLen = Math.max(aLow.length, bLow.length);
  if (maxLen === 0) return 1.0;
  return 1 - levenshtein(aLow, bLow) / maxLen;
}

export const NetworkService = {
  /**
   * Find matching inventory items for a given supplier product name.
   * Returns best matches from buyer's inventory, sorted by similarity score.
   * 
   * @param {string} buyerUserId
   * @param {string} supplierProductName
   * @param {string|null} supplierSku
   * @param {string|null} supplierId - If provided, also checks supplier_product_links first
   */
  async findSimilarProduct(buyerUserId, supplierProductName, supplierSku = null, supplierId = null) {
    try {
      // 1. Check if a permanent supplier_product_link exists (fastest path)
      if (supplierId) {
        const { data: link } = await supabase
          .from("supplier_product_links")
          .select("*, inventory(id, name, sku, stock, price)")
          .eq("supplier_id", supplierId)
          .eq("buyer_id", buyerUserId)
          .eq("supplier_product_name", supplierProductName)
          .maybeSingle();

        if (link && link.inventory) {
          return {
            match: link.inventory,
            score: link.confidence_score || 1.0,
            matchType: "permanent_link",
            linkId: link.id
          };
        }
      }

      // 2. Fetch buyer's entire inventory for fuzzy matching
      const { data: inventory } = await supabase
        .from("inventory")
        .select("id, name, sku, stock, price, category")
        .eq("user_id", buyerUserId);

      if (!inventory || inventory.length === 0) {
        return { match: null, score: 0, matchType: "none" };
      }

      // 3. Score each inventory item
      let bestMatch = null;
      let bestScore = 0;

      for (const item of inventory) {
        let score = similarityScore(supplierProductName, item.name);

        // SKU exact match is a strong signal
        if (supplierSku && item.sku && supplierSku.toLowerCase() === item.sku.toLowerCase()) {
          score = Math.max(score, 0.95);
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = item;
        }
      }

      // Threshold: only return match if similarity >= 65%
      if (bestScore >= 0.65) {
        return { match: bestMatch, score: bestScore, matchType: "fuzzy" };
      }

      return { match: null, score: 0, matchType: "none" };
    } catch (err) {
      console.error("[NetworkService] findSimilarProduct error:", err.message);
      return { match: null, score: 0, matchType: "error" };
    }
  },

  /**
   * Push a network notification to a user (graceful — won't crash if table missing)
   */
  async notifyUser(userId, type, title, message, referenceId = null, referenceType = null) {
    try {
      const { error } = await supabase.from("network_notifications").insert({
        user_id: userId,
        type,
        title,
        message,
        reference_id: referenceId,
        reference_type: referenceType,
        is_read: false
      });
      if (error) {
        console.warn("[NetworkService] notifyUser insert failed:", error.message);
      }
    } catch (err) {
      console.warn("[NetworkService] notifyUser exception:", err.message);
    }
  },

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId) {
    try {
      const { count, error } = await supabase
        .from("network_notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  }
};
