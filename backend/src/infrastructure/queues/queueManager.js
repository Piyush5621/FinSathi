import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Shared Redis connection for queues to minimize connections
export const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
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
