import pg from "pg";
const { Pool } = pg;
import dotenv from "dotenv";
dotenv.config();

let pool = null;

/**
 * Returns the centralized PostgreSQL connection pool instance.
 * Returns null if DATABASE_URL is not yet configured in environment.
 */
export function getPostgresPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return null;
    }

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false // Required for Supabase SSL connections
      },
      max: 10, // Restrict pool size to avoid exhausting Supabase connection limits
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });

    pool.on("error", (err) => {
      console.error("[PostgreSQL Pool] Unexpected error on idle client:", err.message);
    });
  }
  return pool;
}
