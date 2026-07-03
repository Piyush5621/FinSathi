import { BullMQPublisher } from './BullMQPublisher.js';
import { InMemoryPublisher } from './InMemoryPublisher.js';
import { logger } from '../../logging/logger.js';

export let eventPublisher;

export const initEventPublisher = () => {
  if (process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_PUBLISHER === 'true') {
    eventPublisher = new InMemoryPublisher();
    logger.info('[EventPublisher] Initialized InMemoryPublisher');
  } else {
    eventPublisher = new BullMQPublisher();
    logger.info('[EventPublisher] Initialized BullMQPublisher');
  }
  return eventPublisher;
};
