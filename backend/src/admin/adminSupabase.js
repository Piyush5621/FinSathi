import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

// Ensure SERVICE_ROLE key is used, not Anon public key.
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || "";

export const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
