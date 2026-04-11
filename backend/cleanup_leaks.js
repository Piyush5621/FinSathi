import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "d:/Projects/FinSathi/backend/.env" });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function cleanGlobalData() {
  console.log("--- CLEANING GLOBAL DATA LEAKS ---");
  
  // Delete customers that have no owner
  const { error: cErr } = await supabase.from("customers").delete().filter("user_id", "is", null);
  if (cErr) console.error("Customer Cleanup Error:", cErr.message);
  else console.log("✅ Cleaned global customers.");

  // Delete sales/invoices that have no owner
  const { error: sErr } = await supabase.from("sales").delete().filter("user_id", "is", null);
  if (sErr) console.error("Sales Cleanup Error:", sErr.message);
  else console.log("✅ Cleaned global sales.");

  // Delete inventory that has no owner
  const { error: iErr } = await supabase.from("inventory").delete().filter("user_id", "is", null);
  if (iErr) console.error("Inventory Cleanup Error:", iErr.message);
  else console.log("✅ Cleaned global inventory.");
}

cleanGlobalData();
