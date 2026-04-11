import { supabase } from "../config/db.js";

export const SupplierRepository = {
  async findAll(userId) {
    const { data, error } = await supabase.from("suppliers").select("*").eq("user_id", userId).order("name");
    if (error) throw error;
    return data;
  },
  async create(userId, payload) {
    const { data, error } = await supabase.from("suppliers").insert([{ ...payload, user_id: userId }]).select().single();
    if (error) throw error;
    return data;
  }
};

export const ExpenseRepository = {
  async findAll(userId) {
    const { data, error } = await supabase.from("expenses").select("*, suppliers(name)").eq("user_id", userId).order("date", { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(userId, payload) {
    const { data, error } = await supabase.from("expenses").insert([{ ...payload, user_id: userId }]).select().single();
    if (error) throw error;
    return data;
  }
};
