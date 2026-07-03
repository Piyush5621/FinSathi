import { adminSupabase } from "../../../admin/adminSupabase.js";

export class AuthRepository {
  static async findOwnerByEmailOrPhone(emailOrPhone) {
    const { data, error } = await adminSupabase
      .from("users")
      .select("*")
      .or(`email.eq.${emailOrPhone},phone.eq.${emailOrPhone}`)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findStaffByEmailOrPhone(emailOrPhone) {
    const { data, error } = await adminSupabase
      .from("staff")
      .select("*")
      .or(`email.eq.${emailOrPhone},phone.eq.${emailOrPhone}`)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findOwnerById(id) {
    const { data, error } = await adminSupabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findStaffById(id) {
    const { data, error } = await adminSupabase
      .from("staff")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async createOrganization(orgData) {
    const { data, error } = await adminSupabase
      .from("organizations")
      .insert([orgData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async createOwner(ownerData) {
    const { data, error } = await adminSupabase
      .from("users")
      .insert([ownerData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateOwner(id, updates) {
    const { data, error } = await adminSupabase
      .from("users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateStaff(id, updates) {
    const { data, error } = await adminSupabase
      .from("staff")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findOrganizationById(id) {
    const { data, error } = await adminSupabase
      .from("organizations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async updateOrganization(id, updates) {
    const { data, error } = await adminSupabase
      .from("organizations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
