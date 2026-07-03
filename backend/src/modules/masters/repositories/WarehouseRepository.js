import { BaseRepository } from "./BaseRepository.js";
import { adminSupabase } from "../../../admin/adminSupabase.js";

export class WarehouseRepository extends BaseRepository {
  static async findByName(name, organizationId) {
    const { data, error } = await adminSupabase
      .from("warehouses")
      .select("*")
      .eq("name", name)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findDefaultWarehouse(organizationId) {
    const { data, error } = await adminSupabase
      .from("warehouses")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_main_hub", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async clearMainHubStatus(organizationId) {
    const { error } = await adminSupabase
      .from("warehouses")
      .update({ is_main_hub: false })
      .eq("organization_id", organizationId);

    if (error) throw error;
  }
}
