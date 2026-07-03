import { BaseRepository } from "./BaseRepository.js";
import { adminSupabase } from "../../../admin/adminSupabase.js";

export class PreferenceRepository extends BaseRepository {
  static async findPreferences(organizationId) {
    const { data, error } = await adminSupabase
      .from("organization_preferences")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async upsertPreferences(organizationId, prefData) {
    const { data, error } = await adminSupabase
      .from("organization_preferences")
      .upsert({
        organization_id: organizationId,
        ...prefData,
        updated_at: new Date().toISOString()
      }, { onConflict: "organization_id" })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findFinancialYearByName(name, organizationId) {
    const { data, error } = await adminSupabase
      .from("financial_years")
      .select("*")
      .eq("name", name)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findActiveFinancialYear(organizationId) {
    const { data, error } = await adminSupabase
      .from("financial_years")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async deactivateAllFinancialYears(organizationId) {
    const { error } = await adminSupabase
      .from("financial_years")
      .update({ is_active: false })
      .eq("organization_id", organizationId);

    if (error) throw error;
  }
}
