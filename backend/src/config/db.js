import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

let supabaseLocal = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  supabaseLocal = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
} else {
  console.warn("WARN: SUPABASE_URL or SUPABASE_KEY not set. Using mock supabase client returning empty results.");

  const makeChain = () => {
    const chain = {
      _data: [],
      _error: null,
      select() { return this; },
      order() { return this; },
      limit() { return this; },
      gte() { return this; },
      eq() { return this; },
      on() { return this; },
      subscribe() { return this; },
      then(resolve) { return Promise.resolve({ data: this._data, error: this._error }).then(resolve); },
      catch() { return this; },
    };
    return chain;
  };

  supabaseLocal = {
    from: () => makeChain(),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
  };
}

export const supabase = supabaseLocal;