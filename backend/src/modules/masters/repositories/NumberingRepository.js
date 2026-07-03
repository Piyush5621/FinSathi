import { BaseRepository } from "./BaseRepository.js";
import { adminSupabase } from "../../../admin/adminSupabase.js";

export class NumberingRepository extends BaseRepository {
  static async findSeries(documentType, fiscalYear, prefix, organizationId) {
    const { data, error } = await adminSupabase
      .from("numbering_series")
      .select("*")
      .eq("document_type", documentType)
      .eq("fiscal_year", fiscalYear)
      .eq("prefix", prefix)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findActiveSeriesForDoc(documentType, fiscalYear, organizationId) {
    const { data, error } = await adminSupabase
      .from("numbering_series")
      .select("*")
      .eq("document_type", documentType)
      .eq("fiscal_year", fiscalYear)
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async incrementSeries(id, nextNumber) {
    const { data, error } = await adminSupabase
      .from("numbering_series")
      .update({ next_number: nextNumber, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
