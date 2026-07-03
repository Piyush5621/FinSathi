import { adminSupabase } from "../../../admin/adminSupabase.js";

export class BaseRepository {
  /**
   * Generic find with scoping, soft-delete filtering, pagination, and sorting
   */
  static async find(table, { organizationId, filters = {}, pagination = {}, sort = {} }) {
    let query = adminSupabase
      .from(table)
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId);

    // Apply soft-delete filter by default
    if (filters.includeDeleted !== true) {
      query = query.is("deleted_at", null);
    }

    // Apply custom filters
    for (const [key, val] of Object.entries(filters)) {
      if (key === "includeDeleted") continue;
      if (val !== undefined && val !== null) {
        query = query.eq(key, val);
      }
    }

    // Apply sorting
    if (sort.field) {
      query = query.order(sort.field, { ascending: sort.ascending !== false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // Apply pagination
    if (pagination.limit) {
      const page = pagination.page || 1;
      const from = (page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    
    return { data, count };
  }

  static async findById(table, id, organizationId) {
    const { data, error } = await adminSupabase
      .from(table)
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async create(table, data) {
    const { data: record, error } = await adminSupabase
      .from(table)
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return record;
  }

  static async update(table, id, organizationId, data) {
    const { data: record, error } = await adminSupabase
      .from(table)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error) throw error;
    return record;
  }

  static async softDelete(table, id, organizationId, deletedBy) {
    const { data: record, error } = await adminSupabase
      .from(table)
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error) throw error;
    return record;
  }

  static async restore(table, id, organizationId) {
    const { data: record, error } = await adminSupabase
      .from(table)
      .update({
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error) throw error;
    return record;
  }

  static async hardDelete(table, id, organizationId) {
    const { error } = await adminSupabase
      .from(table)
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) throw error;
  }
}
