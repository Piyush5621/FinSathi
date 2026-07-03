import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const tables = [
  "organizations",
  "users",
  "staff",
  "identity_sessions",
  "identity_refresh_tokens",
  "identity_login_history",
  "uom_groups",
  "units_of_measure",
  "companies",
  "brands",
  "categories",
  "gst_rates",
  "hsn_masters",
  "financial_years",
  "numbering_series",
  "organization_preferences"
];

async function verifyTables() {
  console.log("--- VERIFYING IDENTITY TABLES ---");
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select("*").limit(0);
      if (error) {
        console.error(`❌ Table '${table}' verification FAILED:`, error.message);
      } else {
        console.log(`✅ Table '${table}' verified successfully.`);
      }
    } catch (err) {
      console.error(`❌ Table '${table}' threw error:`, err.message);
    }
  }
}

verifyTables();
