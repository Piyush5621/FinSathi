import { supabase } from "../config/db.js";
import { NetworkService } from "../services/NetworkService.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";

/**
 * NetworkController — Business connections management
 * Handles: search, send request, accept/reject, list, remove, profile
 */

// Search businesses by GST, phone, or business name (excludes self)
export const searchBusinesses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return errorResponse(res, "Search query must be at least 2 characters", 400);
    }

    const term = q.trim().toLowerCase();

    const { data: results, error } = await supabase
      .from("users")
      .select("id, business_name, business_type, city, state, phone, gstin, name")
      .or(`business_name.ilike.%${term}%,phone.ilike.%${term}%,gstin.ilike.%${term}%`)
      .neq("id", userId)
      .limit(20);

    if (error) throw error;

    // Annotate with existing connection status
    const enriched = await Promise.all(results.map(async (biz) => {
      const { data: conn } = await supabase
        .from("business_connections")
        .select("id, status, connection_type")
        .or(`and(requester_id.eq.${userId},receiver_id.eq.${biz.id}),and(requester_id.eq.${biz.id},receiver_id.eq.${userId})`)
        .maybeSingle();

      return { ...biz, connection: conn || null };
    }));

    return successResponse(res, enriched, "Business search results");
  } catch (err) {
    console.error("searchBusinesses error:", err);
    return errorResponse(res, err, 500, "Search failed");
  }
};

// Send a connection request to another business
export const sendConnectionRequest = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const { receiver_id, connection_type } = req.body;

    if (!receiver_id) return errorResponse(res, "receiver_id is required", 400);
    if (receiver_id === requesterId) return errorResponse(res, "Cannot connect to yourself", 400);

    // Check if connection already exists
    const { data: existing } = await supabase
      .from("business_connections")
      .select("id, status")
      .or(`and(requester_id.eq.${requesterId},receiver_id.eq.${receiver_id}),and(requester_id.eq.${receiver_id},receiver_id.eq.${requesterId})`)
      .maybeSingle();

    if (existing) {
      if (existing.status === "accepted") return errorResponse(res, "Already connected", 409);
      if (existing.status === "pending") return errorResponse(res, "Connection request already pending", 409);
    }

    const { data: conn, error } = await supabase
      .from("business_connections")
      .insert({
        requester_id: requesterId,
        receiver_id,
        connection_type: connection_type || "Supplier",
        status: "pending"
      })
      .select()
      .single();

    if (error) throw error;

    // Notify receiver
    const { data: requester } = await supabase
      .from("users")
      .select("business_name, name")
      .eq("id", requesterId)
      .single();

    await NetworkService.notifyUser(
      receiver_id,
      "connection_request",
      "New Connection Request",
      `${requester?.business_name || requester?.name || "A business"} wants to connect with you.`,
      conn.id,
      "business_connection"
    );

    return createdResponse(res, conn, "Connection request sent successfully");
  } catch (err) {
    console.error("sendConnectionRequest error:", err);
    return errorResponse(res, err, 500, "Failed to send connection request");
  }
};

// Accept or reject a connection request
export const respondToRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { action } = req.body; // 'accept' or 'reject'

    if (!["accept", "reject"].includes(action)) {
      return errorResponse(res, "action must be 'accept' or 'reject'", 400);
    }

    const { data: conn, error: fetchErr } = await supabase
      .from("business_connections")
      .select("*")
      .eq("id", id)
      .eq("receiver_id", userId)
      .eq("status", "pending")
      .single();

    if (fetchErr || !conn) return errorResponse(res, "Connection request not found", 404);

    const newStatus = action === "accept" ? "accepted" : "rejected";
    const updatePayload = { status: newStatus };
    if (action === "accept") updatePayload.connected_at = new Date().toISOString();

    const { data: updated, error: updateErr } = await supabase
      .from("business_connections")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Notify requester
    const { data: receiver } = await supabase
      .from("users")
      .select("business_name, name")
      .eq("id", userId)
      .single();

    if (action === "accept") {
      await NetworkService.notifyUser(
        conn.requester_id,
        "connection_accepted",
        "Connection Accepted!",
        `${receiver?.business_name || "A business"} accepted your connection request.`,
        conn.id,
        "business_connection"
      );
    }

    return successResponse(res, updated, `Connection ${newStatus} successfully`);
  } catch (err) {
    console.error("respondToRequest error:", err);
    return errorResponse(res, err, 500, "Failed to respond to connection request");
  }
};

// List all accepted connections for the logged-in user
export const getConnections = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: connections, error } = await supabase
      .from("business_connections")
      .select("*, requester:requester_id(id, business_name, business_type, city, state, phone, gstin), receiver:receiver_id(id, business_name, business_type, city, state, phone, gstin)")
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("status", "accepted")
      .order("connected_at", { ascending: false });

    if (error) throw error;

    // Normalize: always return the "other party" as `partner`
    const normalized = connections.map(conn => ({
      ...conn,
      partner: conn.requester_id === userId ? conn.receiver : conn.requester,
      role: conn.requester_id === userId ? "requester" : "receiver"
    }));

    return successResponse(res, normalized, "Connections retrieved");
  } catch (err) {
    console.error("getConnections error:", err);
    return errorResponse(res, err, 500, "Failed to fetch connections");
  }
};

// List pending incoming requests for the user
export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: requests, error } = await supabase
      .from("business_connections")
      .select("*, requester:requester_id(id, business_name, business_type, city, phone)")
      .eq("receiver_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return successResponse(res, requests, "Pending requests retrieved");
  } catch (err) {
    console.error("getPendingRequests error:", err);
    return errorResponse(res, err, 500, "Failed to fetch pending requests");
  }
};

// Remove / soft-delete a connection
export const removeConnection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { error } = await supabase
      .from("business_connections")
      .update({ status: "removed" })
      .eq("id", id)
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

    if (error) throw error;
    return successResponse(res, null, "Connection removed");
  } catch (err) {
    console.error("removeConnection error:", err);
    return errorResponse(res, err, 500, "Failed to remove connection");
  }
};

// Get full partner profile with trade stats
export const getConnectionProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partnerId } = req.params;

    // Verify connection exists
    const { data: conn } = await supabase
      .from("business_connections")
      .select("*")
      .or(`and(requester_id.eq.${userId},receiver_id.eq.${partnerId}),and(requester_id.eq.${partnerId},receiver_id.eq.${userId})`)
      .eq("status", "accepted")
      .maybeSingle();

    if (!conn) return errorResponse(res, "Not connected with this business", 403);

    // Fetch partner user profile
    const { data: partner } = await supabase
      .from("users")
      .select("id, business_name, business_type, name, city, state, phone, gstin, email")
      .eq("id", partnerId)
      .single();

    // Trade stats
    const { data: transactions } = await supabase
      .from("trade_transactions")
      .select("id, total_amount, status, created_at")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`);

    const tradeVolume = (transactions || []).reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
    const importedCount = (transactions || []).filter(t => t.status === "Imported").length;

    // Check preferred status
    const { data: pref } = await supabase
      .from("preferred_suppliers")
      .select("id, is_primary, priority_order")
      .eq("buyer_id", userId)
      .eq("supplier_id", partnerId)
      .maybeSingle();

    // Check trade credit
    const { data: credit } = await supabase
      .from("trade_credit_accounts")
      .select("credit_limit, outstanding_amount, status")
      .or(`and(supplier_id.eq.${partnerId},buyer_id.eq.${userId}),and(supplier_id.eq.${userId},buyer_id.eq.${partnerId})`)
      .maybeSingle();

    return successResponse(res, {
      partner,
      connection: conn,
      tradeStats: {
        totalTransactions: (transactions || []).length,
        tradeVolume,
        importedCount
      },
      isPreferred: !!pref,
      isPrimary: pref?.is_primary || false,
      tradeCredit: credit || null,
      recentTransactions: (transactions || []).slice(0, 5)
    }, "Partner profile retrieved");
  } catch (err) {
    console.error("getConnectionProfile error:", err);
    return errorResponse(res, err, 500, "Failed to fetch connection profile");
  }
};

// Get network overview stats for dashboard
export const getNetworkOverview = async (req, res) => {
  try {
    const userId = req.user.id;

    const [connectionsRes, pendingRes, inboxRes, tradeVolumeRes] = await Promise.all([
      supabase.from("business_connections").select("*", { count: "exact", head: true }).or(`requester_id.eq.${userId},receiver_id.eq.${userId}`).eq("status", "accepted"),
      supabase.from("business_connections").select("*", { count: "exact", head: true }).eq("receiver_id", userId).eq("status", "pending"),
      supabase.from("trade_transactions").select("*", { count: "exact", head: true }).eq("receiver_id", userId).eq("status", "Pending"),
      supabase.from("trade_transactions").select("total_amount").or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    ]);

    const tradeVolume = (tradeVolumeRes.data || []).reduce((sum, t) => sum + Number(t.total_amount || 0), 0);

    return successResponse(res, {
      activeConnections: connectionsRes.count || 0,
      pendingRequests: pendingRes.count || 0,
      pendingPurchases: inboxRes.count || 0,
      monthlyTradeVolume: tradeVolume
    }, "Network overview retrieved");
  } catch (err) {
    console.error("getNetworkOverview error:", err);
    return errorResponse(res, err, 500, "Failed to fetch network overview");
  }
};
