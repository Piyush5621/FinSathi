import { supabase } from "../config/db.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";

/**
 * Get all sales leads
 * GET /api/crm/leads
 */
export const getLeads = async (req, res) => {
  try {
    const { data: leads, error } = await supabase
      .from("leads")
      .select("*, staff(name)")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return successResponse(res, leads, "Leads retrieved successfully");
  } catch (err) {
    console.error("getLeads Error:", err);
    return errorResponse(res, err, 500, "Failed to load CRM leads");
  }
};

/**
 * Create new lead
 * POST /api/crm/leads
 */
export const createLead = async (req, res) => {
  try {
    const { name, business_name, phone, email, status, expected_revenue, source, assigned_to } = req.body;

    if (!name) {
      return errorResponse(res, "Lead contact name is required", 400);
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .insert([{
        user_id: req.user.id,
        name,
        business_name,
        phone,
        email,
        status: status || "New Lead",
        expected_revenue: expected_revenue || 0,
        source,
        assigned_to
      }])
      .select("*")
      .single();

    if (error) throw error;
    return createdResponse(res, lead, "Lead created successfully");
  } catch (err) {
    console.error("createLead Error:", err);
    return errorResponse(res, err, 500, "Failed to create lead");
  }
};

/**
 * Update lead (updates pipeline stage, expected revenue, etc.)
 * PUT /api/crm/leads/:id
 */
export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: lead, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select("*")
      .single();

    if (error) throw error;
    return successResponse(res, lead, "Lead pipeline details updated");
  } catch (err) {
    console.error("updateLead Error:", err);
    return errorResponse(res, err, 500, "Failed to update lead");
  }
};

/**
 * Get Activities for a specific Lead
 * GET /api/crm/leads/:id/activities
 */
export const getLeadActivities = async (req, res) => {
  try {
    const { id: leadId } = req.params;

    const [activities, notes] = await Promise.all([
      supabase.from("lead_activities").select("*").eq("lead_id", leadId).order("date", { ascending: false }),
      supabase.from("lead_notes").select("*").eq("lead_id", leadId).order("created_at", { ascending: false })
    ]);

    if (activities.error) throw activities.error;
    if (notes.error) throw notes.error;

    return successResponse(res, {
      activities: activities.data,
      notes: notes.data
    }, "Lead activity history retrieved");
  } catch (err) {
    console.error("getLeadActivities Error:", err);
    return errorResponse(res, err, 500, "Failed to load lead activities");
  }
};

/**
 * Add lead activity log (Call, Email, WhatsApp, Meeting)
 * POST /api/crm/leads/:id/activities
 */
export const addLeadActivity = async (req, res) => {
  try {
    const { id: leadId } = req.params;
    const { type, notes, date } = req.body;

    if (!type) {
      return errorResponse(res, "Activity type is required", 400);
    }

    const { data: act, error } = await supabase
      .from("lead_activities")
      .insert([{
        user_id: req.user.id,
        lead_id: leadId,
        type,
        notes,
        date: date || new Date().toISOString()
      }])
      .select("*")
      .single();

    if (error) throw error;
    return createdResponse(res, act, "Activity logged successfully");
  } catch (err) {
    console.error("addLeadActivity Error:", err);
    return errorResponse(res, err, 500, "Failed to log activity");
  }
};

/**
 * Add text note to lead
 * POST /api/crm/leads/:id/notes
 */
export const addLeadNote = async (req, res) => {
  try {
    const { id: leadId } = req.params;
    const { content } = req.body;

    if (!content) {
      return errorResponse(res, "Note content is required", 400);
    }

    const { data: note, error } = await supabase
      .from("lead_notes")
      .insert([{
        user_id: req.user.id,
        lead_id: leadId,
        content
      }])
      .select("*")
      .single();

    if (error) throw error;
    return createdResponse(res, note, "Note appended to lead");
  } catch (err) {
    console.error("addLeadNote Error:", err);
    return errorResponse(res, err, 500, "Failed to append note");
  }
};

/**
 * Get CRM analytics summary (funnel, conversion)
 * GET /api/crm/analytics
 */
export const getCrmAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: leads, error } = await supabase
      .from("leads")
      .select("status, expected_revenue")
      .eq("user_id", userId);

    if (error) throw error;

    // Aggregate statistics
    const totals = {
      totalLeads: leads.length,
      wonLeads: 0,
      lostLeads: 0,
      activeLeads: 0,
      expectedRevenue: 0,
      funnel: {
        "New Lead": 0,
        "Contacted": 0,
        "Interested": 0,
        "Quotation Sent": 0,
        "Negotiation": 0,
        "Won": 0,
        "Lost": 0
      }
    };

    leads.forEach(l => {
      if (l.status === "Won") {
        totals.wonLeads++;
      } else if (l.status === "Lost") {
        totals.lostLeads++;
      } else {
        totals.activeLeads++;
        totals.expectedRevenue += Number(l.expected_revenue || 0);
      }
      if (totals.funnel[l.status] !== undefined) {
        totals.funnel[l.status]++;
      }
    });

    const conversionRate = totals.totalLeads > 0 
      ? Math.round((totals.wonLeads / totals.totalLeads) * 100)
      : 0;

    return successResponse(res, {
      ...totals,
      conversionRate
    }, "CRM Analytics aggregated successfully");
  } catch (err) {
    console.error("getCrmAnalytics Error:", err);
    return errorResponse(res, err, 500, "Failed to aggregate CRM analytics");
  }
};
