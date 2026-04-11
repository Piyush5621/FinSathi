import { supabase } from '../config/db.js';

export const getWarehouses = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addWarehouse = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('warehouses')
      .insert([{ ...req.body, user_id: req.user.id }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSuppliers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('user_id', req.user.id)
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addSupplier = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .insert([{ ...req.body, user_id: req.user.id }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPurchaseOrders = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name), warehouses(name)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createPurchaseOrder = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert([{ ...req.body, user_id: req.user.id }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
