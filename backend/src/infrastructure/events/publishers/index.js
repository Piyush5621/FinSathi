import { BullMQPublisher } from './BullMQPublisher.js';
import { InMemoryPublisher } from './InMemoryPublisher.js';
import { logger } from '../../logging/logger.js';

export let eventPublisher;

export const initEventPublisher = () => {
  if (process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_PUBLISHER === 'true' || !process.env.REDIS_URL) {
    eventPublisher = new InMemoryPublisher();
    logger.info('[EventPublisher] Initialized InMemoryPublisher' + (!process.env.REDIS_URL ? ' (No REDIS_URL configured)' : ''));
  } else {
    try {
      eventPublisher = new BullMQPublisher();
      logger.info('[EventPublisher] Initialized BullMQPublisher');
    } catch (err) {
      logger.warn('[EventPublisher] Failed to initialize BullMQPublisher, falling back to InMemoryPublisher:', err.message);
      eventPublisher = new InMemoryPublisher();
    }
  }
  return eventPublisher;
};
