import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkData() {
  console.log("--- DB IDENTITY MIGRATION DATA INSPECT ---");
  try {
    // 1. Orgs
    const { data: orgs, error: orgErr } = await supabase.from("organizations").select("*");
    if (orgErr) throw orgErr;
    console.log(`✅ Organizations count: ${orgs.length}`);
    if (orgs.length > 0) {
      console.log("Sample Organization:", orgs[0]);
    }

    // 2. Users
    const { data: users, error: userErr } = await supabase.from("users").select("id, email, organization_id, jwt_version, failed_login_attempts");
    if (userErr) throw userErr;
    console.log(`✅ Users count: ${users.length}`);
    if (users.length > 0) {
      console.log("Sample User:", users[0]);
    }

    // 3. Staff
    const { data: staff, error: staffErr } = await supabase.from("staff").select("id, name, organization_id, email, jwt_version");
    if (staffErr) throw staffErr;
    console.log(`✅ Staff count: ${staff.length}`);
    if (staff.length > 0) {
      console.log("Sample Staff:", staff[0]);
    }
  } catch (err) {
    console.error("❌ Data check failed:", err.message);
  }
}

checkData();
