import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().optional().default('5001'),
  
  // Security
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters long'),
  
  // Database
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is required'),
  
  // Infrastructure
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL (e.g. redis://127.0.0.1:6379)').optional(),
  
  // AI Provider
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required')
});

export const validateEnv = () => {
  try {
    const parsed = envSchema.parse(process.env);
    console.log('[Startup] Environment configuration validated successfully.');
    return parsed;
  } catch (error) {
    console.error('[Startup] Critical Configuration Error:');
    console.error(error.message || error);
    console.error('[Startup] Shutting down due to invalid configuration.');
    process.exit(1); // Fail fast
  }
};
