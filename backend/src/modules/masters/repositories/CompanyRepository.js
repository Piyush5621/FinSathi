import { BaseRepository } from "./BaseRepository.js";
import { adminSupabase } from "../../../admin/adminSupabase.js";

export class CompanyRepository extends BaseRepository {
  static async findByName(name, organizationId) {
    const { data, error } = await adminSupabase
      .from("companies")
      .select("*")
      .eq("name", name)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
