import { v4 as uuidv4 } from 'uuid';
import { getCorrelationId } from '../logging/correlation.js';

export class EventContract {
  /**
   * Constructs a standardized Event object
   * @param {Object} params
   * @param {string} params.eventType - From EventRegistry
   * @param {string} params.aggregateId - ID of the entity that changed
   * @param {string} params.aggregateType - Type of entity (e.g. 'Trade', 'BusinessProfile')
   * @param {string} [params.tenantId='default'] - Multi-tenant ID (if applicable)
   * @param {string} [params.storeId] - Associated store ID
   * @param {string} [params.userId] - User who triggered the event
   * @param {Object} params.payload - Custom business data
   * @param {number} [params.version=1] - Event schema version
   */
  static create({ eventType, aggregateId, aggregateType, tenantId = 'default', storeId = null, userId = null, payload, version = 1 }) {
    if (!eventType || !aggregateId || !aggregateType || !payload) {
      throw new Error('Missing required fields for EventContract: eventType, aggregateId, aggregateType, payload');
    }

    return {
      eventId: uuidv4(),
      eventType,
      aggregateId,
      aggregateType,
      version,
      timestamp: new Date().toISOString(),
      tenantId,
      storeId,
      userId,
      correlationId: getCorrelationId(),
      payload
    };
  }
}
