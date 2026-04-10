import { supabase } from "../config/db.js";

export const SupplierRepository = {
  async findAll() {
    const { data, error } = await supabase.from("suppliers").select("*").order("name");
    if (error) throw error;
    return data;
  },
  async create(payload) {
    const { data, error } = await supabase.from("suppliers").insert([payload]).select().single();
    if (error) throw error;
    return data;
  }
};

export const ExpenseRepository = {
  async findAll() {
    const { data, error } = await supabase.from("expenses").select("*, suppliers(name)").order("date", { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(payload) {
    const { data, error } = await supabase.from("expenses").insert([payload]).select().single();
    if (error) throw error;
    return data;
  }
};
