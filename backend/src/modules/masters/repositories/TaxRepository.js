import { BaseRepository } from "./BaseRepository.js";
import { adminSupabase } from "../../../admin/adminSupabase.js";

export class TaxRepository extends BaseRepository {
  static async findTaxCategoryByName(name, organizationId) {
    const { data, error } = await adminSupabase
      .from("tax_categories")
      .select("*")
      .eq("name", name)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findGstRateByTaxCategoryAndRate(taxCategoryId, rate, organizationId) {
    const { data, error } = await adminSupabase
      .from("gst_rates")
      .select("*")
      .eq("tax_category_id", taxCategoryId)
      .eq("rate", rate)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findHsnByCode(hsnCode, organizationId) {
    const { data, error } = await adminSupabase
      .from("hsn_masters")
      .select("*, gst_rates(*)")
      .eq("hsn_code", hsnCode)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
