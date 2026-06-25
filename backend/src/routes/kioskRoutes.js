import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

/** 🏢 Get Business info for Kiosk (Public) */
router.get('/business/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('business_name')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: "Business not found" });
      }
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "Business not found" });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** 👷 Get Staff list for Kiosk (Public - only active) */
router.get('/staff/:bizId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, position')
      .eq('user_id', req.params.bizId)
      .eq('status', 'active');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** 📝 Mark Attendance from Kiosk (Public) */
router.post('/attendance', async (req, res) => {
  try {
    const { bizId, staffId, staffNo, date, clock_in } = req.body;
    
    let targetStaffId = staffId;

    // If only staffNo (PIN) is provided, find the staff first
    if (!targetStaffId && staffNo) {
      const { data: staff, error: staffErr } = await supabase
        .from('staff')
        .select('id')
        .eq('qr_token', staffNo)
        .eq('user_id', bizId)
        .single();
      
      if (staffErr || !staff) return res.status(404).json({ error: "Staff PIN not found" });
      targetStaffId = staff.id;
    }

    const { data, error } = await supabase
      .from('attendance')
      .upsert({ 
        staff_id: targetStaffId, 
        user_id: bizId,
        date: date || new Date().toISOString().split('T')[0], 
        status: 'present',
        clock_in: clock_in || new Date().toISOString()
      }, { onConflict: 'staff_id, date' })
      .select('*, staff(name, position)')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
