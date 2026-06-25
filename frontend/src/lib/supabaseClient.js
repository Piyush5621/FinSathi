import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

let supabaseInstance;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Supabase credentials missing in Frontend. Using restricted mode.");
  // Provide a dummy client that doesn't crash on import
  supabaseInstance = {
    from: () => ({
      select: () => ({ order: () => ({ limit: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }) }),
      upsert: () => Promise.resolve({ data: null, error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
    }),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
  };
} else {
  supabaseInstance = createClient(supabaseUrl, supabaseKey);
}

export const supabase = supabaseInstance;
