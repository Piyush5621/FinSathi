import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

let supabaseLocal = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  supabaseLocal = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
} else {
  console.warn("WARN: SUPABASE_URL or SUPABASE_KEY not set. Using mock supabase client.");

  const makeChain = () => {
    const chain = {
      _data: [],
      _error: null,
      select: function() { return this; },
      order: function() { return this; },
      limit: function() { return this; },
      gte: function() { return this; },
      eq: function() { return this; },
      on: function() { return this; },
      subscribe: function() { return this; },
      single: function() { return this; },
      then: function(resolve) { 
        const result = Array.isArray(this._data) && this._data.length === 0 ? null : (Array.isArray(this._data) ? this._data[0] : this._data);
        return Promise.resolve({ data: result, error: this._error }).then(resolve); 
      },
      catch: function(reject) { return this; },
    };
    return chain;
  };

  supabaseLocal = {
    from: () => makeChain(),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
  };
}

export const supabase = supabaseLocal;

/**
 * Creates a Supabase client with the user's JWT token.
 * This handles the Bearer token cleanup and ensures the apikey is sent.
 * @param {string} token - The user's JWT token from the Authorization header.
 */
export const createSupabaseUserClient = (token) => {
  // If no token or config, return the default client
  if (!token || !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    return supabase;
  }
  
  // FIX: Strip "Bearer " if it's already there to avoid "Bearer Bearer" issues
  const cleanToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;

  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    global: {
      headers: {
        // Use the cleaned token
        Authorization: `Bearer ${cleanToken}`,
        // Explicitly include the apikey to satisfy PostgREST requirements
        apikey: process.env.SUPABASE_KEY 
      }
    }
  });
};