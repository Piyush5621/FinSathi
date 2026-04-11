import "dotenv/config";
import { supabase } from "./src/config/db.js";

console.log("--- DIAGNOSTIC START ---");
console.log("PORT:", process.env.PORT);
console.log("SUPABASE_URL:", process.env.SUPABASE_URL ? "SET" : "MISSING");
console.log("SUPABASE_KEY:", process.env.SUPABASE_KEY ? "SET" : "MISSING");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "SET" : "MISSING");

async function testSupabase() {
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      console.error("Supabase Connection Error:", error.message);
    } else {
      console.log("Supabase Connection: OK");
    }
  } catch (err) {
    console.error("Supabase Exception:", err.message);
  }
}

testSupabase();
