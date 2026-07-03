import { BaseRepository } from "../../masters/repositories/BaseRepository.js";
import { adminSupabase } from "../../../admin/adminSupabase.js";

export class VariantRepository extends BaseRepository {
  static async findBySku(sku, organizationId) {
    const { data, error } = await adminSupabase
      .from("product_variants")
      .select("*")
      .eq("sku", sku)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findProductVariants(productId, organizationId) {
    const { data, error } = await adminSupabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .eq("organization_id", organizationId)
      .is("deleted_at", null);

    if (error) throw error;
    return data;
  }
}
