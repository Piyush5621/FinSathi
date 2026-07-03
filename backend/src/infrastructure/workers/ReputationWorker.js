import { Worker } from 'bullmq';
import { connection, QUEUES } from '../queues/queueManager.js';
import { logger } from '../logging/logger.js';

export class ReputationWorker {
  constructor() {
    this.worker = new Worker(QUEUES.REPUTATION, async (job) => {
      logger.info(`[ReputationWorker] Processing event ${job.name} (Job ID: ${job.id}, Correlation: ${job.data.correlationId})`);
      
      const { eventType, payload } = job.data;
      
      switch (eventType) {
        case 'TradeCompleted':
          // await ReputationService.recalculateTrustScore(payload.partnerId)
          break;
        case 'TradeRejected':
          // await ReputationService.recordRejection(payload.partnerId)
          break;
        case 'PaymentDelayed':
          // await ReputationService.recordDelay(payload.partnerId, payload.delayDays)
          break;
        default:
          logger.warn(`[ReputationWorker] Unknown event type: ${eventType}`);
      }
    }, { connection });

    this.worker.on('completed', job => logger.info(`[ReputationWorker] Job ${job.id} completed.`));
    this.worker.on('failed', (job, err) => logger.error(`[ReputationWorker] Job ${job.id} failed:`, { error: err.message }));
  }
  
  async close() {
    await this.worker.close();
  }
}
