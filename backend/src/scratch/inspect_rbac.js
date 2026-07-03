import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkUsers() {
  const { data: users, error } = await supabase.from("users").select("*").limit(5);
  if (error) {
    console.error("Error fetching users:", error);
  } else {
    console.log("Users fetched successfully:", users.length);
    if (users.length > 0) {
      console.log("Sample user:", users[0].email);
    }
  }
}

checkUsers();
