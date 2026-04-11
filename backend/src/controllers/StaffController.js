import { supabase } from '../config/db.js';

export const getStaff = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('user_id', req.user.id)
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addStaff = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('staff')
      .insert([{ ...req.body, user_id: req.user.id }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAttendance = async (req, res) => {
  try {
    const { date, staff_id } = req.query;
    let query = supabase.from('attendance').select('*, staff(name)').eq('user_id', req.user.id);
    
    if (date) query = query.eq('date', date);
    if (staff_id) query = query.eq('staff_id', staff_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const markAttendance = async (req, res) => {
  try {
    const { staff_id, date, status, clock_in } = req.body;
    const { data, error } = await supabase
      .from('attendance')
      .upsert({ 
        staff_id, 
        user_id: req.user.id,
        date, 
        status,
        clock_in: clock_in || new Date().toISOString()
      }, { onConflict: 'staff_id, date' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPayroll = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payroll')
      .select('*, staff(name)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const processPayment = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payroll')
      .insert([{ ...req.body, user_id: req.user.id }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deletePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('payroll')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: "Payment deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
