import { BaseRepository } from "./BaseRepository.js";
import { adminSupabase } from "../../../admin/adminSupabase.js";

export class UomRepository extends BaseRepository {
  static async findGroupByCodeOrName(name, organizationId) {
    const { data, error } = await adminSupabase
      .from("uom_groups")
      .select("*")
      .eq("name", name)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findUomByCode(code, organizationId) {
    const { data, error } = await adminSupabase
      .from("units_of_measure")
      .select("*")
      .eq("code", code)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findGroupWithUnits(groupId, organizationId) {
    const { data, error } = await adminSupabase
      .from("uom_groups")
      .select("*, units_of_measure(*)")
      .eq("id", groupId)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .is("units_of_measure.deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
