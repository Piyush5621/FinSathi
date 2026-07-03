import { EventPublisher } from '../EventPublisher.js';
import { logger } from '../../logging/logger.js';

export class InMemoryPublisher extends EventPublisher {
  constructor() {
    super();
    this.events = [];
  }

  async publish(queueName, event) {
    logger.info(`[InMemoryPublisher] Dispatched to ${queueName}: ${event.eventType} (${event.eventId})`);
    this.events.push({ queueName, event });
    return true;
  }

  getEvents() {
    return this.events;
  }

  clear() {
    this.events = [];
  }
}
