import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "d:/Projects/FinSathi/backend/.env" });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkInventorySchema() {
  const { data, error } = await supabase.from("inventory").select("*").limit(1);
  if (data && data.length > 0) {
      console.log("Inventory Columns:", Object.keys(data[0]));
  } else {
      console.log("Inventory table is empty or Error:", error);
  }
}
checkInventorySchema();
