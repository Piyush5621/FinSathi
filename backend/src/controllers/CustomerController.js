import { supabase } from "../config/db.js";
import { createNotification } from "./notificationHelper.js";

/** Get all customers */
export const getCustomers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 1000;
    const offset = parseInt(req.query.offset) || 0;

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", req.user.id)
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error("Get Customers Error [500]:", err);
    res.status(500).json({ 
      error: "DATABASE_QUERY_FAILED",
      message: err.message,
      hint: err.hint || "Check if user_id column exists in customers table"
    });
  }
};

/** Add new customer */
export const addCustomer = async (req, res) => {
  try {
    const { name, email, phone, city } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is strictly required." });
    }

    // Perform the insert (✅ Added city so location is tracked)
    const { data, error } = await supabase
      .from("customers")
      .insert([{ 
        user_id: req.user.id, 
        name, 
        email, 
        phone,
        city
      }])
      .select("*");

    if (error) throw error;

    // ✅ Auto-create a notification (non-blocking)
    try {
      await createNotification(req.user.id, {
        title: `🧍‍♂️ New customer registered: ${name}`,
        type: "info",
      });
    } catch (notifError) {
      console.warn("Notification creation failed:", notifError.message);
    }

    res.status(201).json({
      message: "Customer added successfully.",
      customer: data[0],
    });
  } catch (err) {
    console.error("Add Customer Error:", err.message);
    res.status(500).json({ message: err.message || "Failed to add customer" });
  }
};