import { EventPublisher } from '../EventPublisher.js';
import { getQueue } from '../../queues/queueManager.js';
import { logger } from '../../logging/logger.js';

export class BullMQPublisher extends EventPublisher {
  async publish(queueName, event) {
    try {
      const queue = getQueue(queueName);
      
      // Use the eventId as the jobId to enforce idempotency at the BullMQ level
      await queue.add(event.eventType, event, {
        jobId: event.eventId,
      });
      
      logger.info(`[BullMQPublisher] Published event ${event.eventType} to queue ${queueName} with correlationId ${event.correlationId}`);
      return true;
    } catch (error) {
      // Graceful degradation: Log the failure but don't crash the business transaction
      logger.error(`[BullMQPublisher] Failed to publish event ${event.eventType} to ${queueName}. Redis may be down.`, { error: error.message, eventId: event.eventId });
      return false;
    }
  }
}
