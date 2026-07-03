import { BaseRepository } from "./BaseRepository.js";
import { adminSupabase } from "../../../admin/adminSupabase.js";

export class BrandRepository extends BaseRepository {
  static async findByName(companyId, name, organizationId) {
    let query = adminSupabase
      .from("brands")
      .select("*")
      .eq("name", name)
      .eq("organization_id", organizationId)
      .is("deleted_at", null);

    if (companyId) {
      query = query.eq("company_id", companyId);
    } else {
      query = query.is("company_id", null);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }
}
