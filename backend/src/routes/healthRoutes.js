import express from 'express';
import { supabase } from '../config/db.js';
import { connection } from '../infrastructure/queues/queueManager.js';

const router = express.Router();

// Liveness Probe (Is the process running?)
router.get('/live', (req, res) => {
  res.status(200).json({ status: 'live', timestamp: new Date().toISOString() });
});

// Readiness Probe (Is it ready to accept traffic?)
router.get('/ready', async (req, res) => {
  const health = {
    status: 'ready',
    timestamp: new Date().toISOString(),
    components: {
      database: 'up',
      redis: 'up',
      ai: 'up'
    }
  };

  try {
    // 1. Database Check
    const { error: dbError } = await supabase.from('Users').select('id').limit(1);
    if (dbError) throw new Error('Database unavailable');

    // 2. Redis Check
    if (connection.status !== 'ready') throw new Error('Redis unavailable');

    // 3. AI Check (Optional ping)
    // In production we might not want to spam Gemini for health checks, 
    // but a basic timeout fetch could work. Assuming "up" for now unless circuit breaker is open.
    // health.components.ai = circuitBreaker.isOpen ? 'down' : 'up';
    
    res.status(200).json(health);
  } catch (error) {
    health.status = 'degraded';
    health.error = error.message;
    res.status(503).json(health);
  }
});

// Legacy root health check
router.get('/', (req, res) => {
  res.redirect('/api/health/live');
});

export default router;
