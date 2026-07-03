import { adminSupabase } from "../../../admin/adminSupabase.js";

export class AuditRepository {
  static async createSession(sessionData) {
    const { data, error } = await adminSupabase
      .from("identity_sessions")
      .insert([sessionData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findSessionById(id) {
    const { data, error } = await adminSupabase
      .from("identity_sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findActiveSessionsForUser(userId) {
    const { data, error } = await adminSupabase
      .from("identity_sessions")
      .select("*")
      .eq("user_id", userId)
      .is("revoked_at", null);

    if (error) throw error;
    return data;
  }

  static async findActiveSessionsForStaff(staffId) {
    const { data, error } = await adminSupabase
      .from("identity_sessions")
      .select("*")
      .eq("staff_id", staffId)
      .is("revoked_at", null);

    if (error) throw error;
    return data;
  }

  static async updateSession(id, updates) {
    const { data, error } = await adminSupabase
      .from("identity_sessions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async revokeAllSessionsForUser(userId) {
    const { data, error } = await adminSupabase
      .from("identity_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("revoked_at", null)
      .select();

    if (error) throw error;
    return data;
  }

  static async revokeAllSessionsForStaff(staffId) {
    const { data, error } = await adminSupabase
      .from("identity_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("staff_id", staffId)
      .is("revoked_at", null)
      .select();

    if (error) throw error;
    return data;
  }

  static async createRefreshToken(tokenData) {
    const { data, error } = await adminSupabase
      .from("identity_refresh_tokens")
      .insert([tokenData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findRefreshTokenByHash(tokenHash) {
    const { data, error } = await adminSupabase
      .from("identity_refresh_tokens")
      .select("*, identity_sessions(*)")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async updateRefreshToken(id, updates) {
    const { data, error } = await adminSupabase
      .from("identity_refresh_tokens")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async revokeRefreshTokenBySession(sessionId) {
    const { data, error } = await adminSupabase
      .from("identity_refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("session_id", sessionId)
      .is("revoked_at", null)
      .select();

    if (error) throw error;
    return data;
  }

  static async revokeAllRefreshTokensForSessionList(sessionIds) {
    if (!sessionIds || sessionIds.length === 0) return [];
    
    const { data, error } = await adminSupabase
      .from("identity_refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .in("session_id", sessionIds)
      .is("revoked_at", null)
      .select();

    if (error) throw error;
    return data;
  }

  static async createLoginHistory(historyData) {
    const { data, error } = await adminSupabase
      .from("identity_login_history")
      .insert([historyData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getLoginHistoryForTenant(tenantId) {
    const { data, error } = await adminSupabase
      .from("identity_login_history")
      .select("*")
      .eq("organization_id", tenantId)
      .order("timestamp", { ascending: false });

    if (error) throw error;
    return data;
  }
}
