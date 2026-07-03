import { Worker } from 'bullmq';
import { connection, QUEUES } from '../queues/queueManager.js';
import { logger } from '../logging/logger.js';

export class GrowthWorker {
  constructor() {
    this.worker = new Worker(QUEUES.GROWTH, async (job) => {
      logger.info(`[GrowthWorker] Processing event ${job.name} (Job ID: ${job.id}, Correlation: ${job.data.correlationId})`);
      
      const { eventType, payload } = job.data;
      
      switch (eventType) {
        case 'MilestoneReached':
        case 'ProfileVerified':
          // await GrowthRuleEngine.evaluateEligibility(payload.businessId)
          break;
        default:
          logger.warn(`[GrowthWorker] Unknown event type: ${eventType}`);
      }
    }, { connection });

    this.worker.on('completed', job => logger.info(`[GrowthWorker] Job ${job.id} completed.`));
    this.worker.on('failed', (job, err) => logger.error(`[GrowthWorker] Job ${job.id} failed:`, { error: err.message }));
  }
  
  async close() {
    await this.worker.close();
  }
}
