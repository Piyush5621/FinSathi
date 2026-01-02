import { supabase } from "../config/db.js";
import { createNotification } from "./notificationHelper.js"; // ✅ helper import

/** Get all customers */
export const getCustomers = async (req, res) => {
  try {
    const { data, error } = await supabase.from("customers").select("*");
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error("Get Customers Error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/** Add new customer */
export const addCustomer = async (req, res) => {
  try {
    const { name, email, phone, city } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // ✅ Insert new customer
    const { data, error } = await supabase
      .from("customers")
      .insert([{ name, email, phone, city }])
      .select("*");

    if (error) throw error;

    // ✅ Auto-create a notification (non-blocking)
    try {
      await createNotification({
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
    res.status(500).json({ message: err.message });
  }
};
