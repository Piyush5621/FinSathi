import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "d:/Projects/FinSathi/backend/.env" });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function listTables() {
  // Query to get all table names in public schema
  const { data, error } = await supabase.rpc("get_tables"); // If I have this RPC
  
  if (error) {
     // Fallback: try to select from a few likely names
     const tables = ["invoices", "sales", "customers", "inventory", "inventory_batches", "expenses", "suppliers", "users"];
     for (const t of tables) {
         const { error: e } = await supabase.from(t).select("count", { count: "exact", head: true });
         console.log(`Table ${t}:`, e ? `Missing (${e.message})` : "Exists");
     }
  } else {
      console.log("Tables:", data);
  }
}

listTables();
