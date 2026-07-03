import { BaseRepository } from "./BaseRepository.js";
import { adminSupabase } from "../../../admin/adminSupabase.js";

export class CategoryRepository extends BaseRepository {
  static async findCategoryBySlug(slug, organizationId) {
    const { data, error } = await adminSupabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findCategoryTemplate(categoryId, organizationId) {
    const { data, error } = await adminSupabase
      .from("category_attribute_templates")
      .select("*")
      .eq("category_id", categoryId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async upsertCategoryTemplate(categoryId, organizationId, schema, actorUserId) {
    const { data, error } = await adminSupabase
      .from("category_attribute_templates")
      .upsert({
        category_id: categoryId,
        organization_id: organizationId,
        attribute_schema: schema,
        updated_at: new Date().toISOString(),
        created_by: actorUserId
      }, { onConflict: "category_id" })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findChildren(parentId, organizationId) {
    const { data, error } = await adminSupabase
      .from("categories")
      .select("*")
      .eq("parent_id", parentId)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return data;
  }
}
