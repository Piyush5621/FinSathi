import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Shared Redis connection for queues to minimize connections
export const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (!process.env.REDIS_URL && times > 3) {
      return null; // Stop retrying if no explicit Redis URL configured
    }
    return Math.min(times * 1000, 10000);
  }
});

connection.on('error', (err) => {
  // Avoid crashing on connection error if Redis is optional in current environment
  if (process.env.NODE_ENV !== 'production' || process.env.REDIS_URL) {
    // console.warn('[Redis] Connection warning:', err.message);
  }
});

export const QUEUES = {
  REPUTATION: 'network.reputation',
  GROWTH: 'network.growth',
  NOTIFICATION: 'network.notification',
  MARKETPLACE: 'network.marketplace',
  AI: 'network.ai',
  CACHE: 'network.cache',
  ANALYTICS: 'network.analytics'
};

const queueInstances = {};

export const getQueue = (queueName) => {
  if (!queueInstances[queueName]) {
    queueInstances[queueName] = new Queue(queueName, {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      }
    });
  }
  return queueInstances[queueName];
};

export const closeQueues = async () => {
  for (const queue of Object.values(queueInstances)) {
    await queue.close();
  }
  await connection.quit();
};
