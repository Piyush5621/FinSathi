import { BaseRepository } from "../../masters/repositories/BaseRepository.js";
import { adminSupabase } from "../../../admin/adminSupabase.js";

export class BarcodeRepository extends BaseRepository {
  static async findByBarcodeValue(barcodeValue, organizationId) {
    const { data, error } = await adminSupabase
      .from("product_barcodes")
      .select("*")
      .eq("barcode_value", barcodeValue)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findProductBarcodes(productId, organizationId) {
    const { data, error } = await adminSupabase
      .from("product_barcodes")
      .select("*")
      .eq("product_id", productId)
      .eq("organization_id", organizationId)
      .is("deleted_at", null);

    if (error) throw error;
    return data;
  }

  static async clearPrimaryFlagForProduct(productId, organizationId) {
    const { error } = await adminSupabase
      .from("product_barcodes")
      .update({ is_primary: false })
      .eq("product_id", productId)
      .eq("organization_id", organizationId);

    if (error) throw error;
  }
}
