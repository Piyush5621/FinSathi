import { ProductRepository } from "../repositories/ProductRepository.js";
import { VariantRepository } from "../repositories/VariantRepository.js";
import { ConflictError } from "../../masters/errors/appErrors.js";
import { adminSupabase } from "../../../admin/adminSupabase.js";

export class SkuGenerator {
  /**
   * Generates a unique SKU for a product or variant
   * @param {object} params 
   * @param {string} params.organizationId
   * @param {string} params.categoryName
   * @param {string} params.brandName
   * @param {string} params.overrideSku
   */
  static async generateSku({ organizationId, categoryName = "GEN", brandName = "FS", overrideSku }) {
    if (overrideSku) {
      // Check duplicate
      const [prodDup, varDup] = await Promise.all([
        ProductRepository.findBySku(overrideSku, organizationId),
        VariantRepository.findBySku(overrideSku, organizationId)
      ]);

      if (prodDup || varDup) {
        throw new ConflictError(`SKU '${overrideSku}' is already registered in this organization.`);
      }
      return overrideSku.toUpperCase();
    }

    // Default auto generation
    const prefix = "FS";
    const catCode = categoryName.trim().substring(0, 3).toUpperCase();
    const brandCode = brandName.trim().substring(0, 3).toUpperCase();

    // Query sequence/total count to form running number
    const { count } = await adminSupabase
      .from("sku_registry")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    const nextSeq = (count || 0) + 1;
    const runningNum = String(nextSeq).padStart(5, "0");

    let sku = `${prefix}-${catCode}-${brandCode}-${runningNum}`;

    // Verify uniqueness in registry, if exists, append random letters
    let attempts = 0;
    while (attempts < 5) {
      const existing = await adminSupabase
        .from("sku_registry")
        .select("id")
        .eq("sku", sku)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (!existing.data) break;

      const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      sku = `${prefix}-${catCode}-${brandCode}-${runningNum}-${randomSuffix}`;
      attempts++;
    }

    return sku;
  }

  static async registerSku(sku, productId, variantId, organizationId) {
    const { data, error } = await adminSupabase
      .from("sku_registry")
      .insert({
        organization_id: organizationId,
        sku,
        product_id: productId,
        variant_id: variantId || null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
