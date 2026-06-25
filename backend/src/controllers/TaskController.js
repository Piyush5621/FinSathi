import { supabase } from "../config/db.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";

/**
 * Get all tasks for user
 * GET /api/tasks
 */
export const getTasks = async (req, res) => {
  try {
    const { status, priority } = req.query;
    let query = supabase
      .from("tasks")
      .select("*, staff(name)")
      .eq("user_id", req.user.id);

    if (status) {
      query = query.eq("status", status);
    }
    if (priority) {
      query = query.eq("priority", priority);
    }

    const { data: tasks, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;
    return successResponse(res, tasks, "Tasks retrieved successfully");
  } catch (err) {
    console.error("getTasks Error:", err);
    return errorResponse(res, err, 500, "Failed to load tasks");
  }
};

/**
 * Create new task
 * POST /api/tasks
 */
export const createTask = async (req, res) => {
  try {
    const { title, description, priority, status, due_date, assigned_to, source_type, source_id } = req.body;

    if (!title) {
      return errorResponse(res, "Task title is required", 400);
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .insert([{
        user_id: req.user.id,
        title,
        description,
        priority: priority || "Medium",
        status: status || "Pending",
        due_date,
        assigned_to,
        source_type,
        source_id
      }])
      .select("*")
      .single();

    if (error) throw error;
    return createdResponse(res, task, "Task created successfully");
  } catch (err) {
    console.error("createTask Error:", err);
    return errorResponse(res, err, 500, "Failed to create task");
  }
};

/**
 * Update task status/assignee
 * PUT /api/tasks/:id
 */
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: task, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select("*")
      .single();

    if (error) throw error;
    return successResponse(res, task, "Task updated successfully");
  } catch (err) {
    console.error("updateTask Error:", err);
    return errorResponse(res, err, 500, "Failed to update task");
  }
};

/**
 * Delete a task
 * DELETE /api/tasks/:id
 */
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) throw error;
    return successResponse(res, { id }, "Task deleted successfully");
  } catch (err) {
    console.error("deleteTask Error:", err);
    return errorResponse(res, err, 500, "Failed to delete task");
  }
};
