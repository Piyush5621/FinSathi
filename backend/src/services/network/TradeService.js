import TradeRepository from '../../repositories/network/TradeRepository.js';
import { EventContract } from '../../infrastructure/events/EventContract.js';
import { QUEUES } from '../../infrastructure/queues/queueManager.js';

/**
 * TradeService
 * Business Logic Layer for the Trade Domain.
 */
class TradeService {
    constructor() {
        this.eventPublisher = null;
    }

    setEventPublisher(publisher) {
        this.eventPublisher = publisher;
    }

    async getInbox(userId, storeId, filters) {
        return await TradeRepository.getInbox(userId, storeId, filters);
    }

    async getOutbox(userId, storeId, filters) {
        return await TradeRepository.getOutbox(userId, storeId, filters);
    }

    async createTrade(senderId, tradePayload) {
        const { receiverId, items, ...tradeDetails } = tradePayload;

        const tradeData = {
            sender_id: senderId,
            receiver_id: receiverId,
            status: 'Pending',
            ...tradeDetails,
            created_at: new Date().toISOString()
        };

        const result = await TradeRepository.createTrade(tradeData, items);

        this._publishEvent('TradeCreated', senderId, null, result.id, result);

        return result;
    }

    async acceptTrade(userId, transactionId) {
        const updated = await TradeRepository.updateTradeStatus(transactionId, 'Accepted');
        
        // userId should technically be validated as the receiver_id, simplified for now
        this._publishEvent('TradeAccepted', userId, null, transactionId, updated);
        
        return updated;
    }

    async rejectTrade(userId, transactionId) {
        const updated = await TradeRepository.updateTradeStatus(transactionId, 'Rejected');
        
        this._publishEvent('TradeRejected', userId, null, transactionId, updated);
        
        return updated;
    }

    /**
     * Helper to publish standard domain events
     */
    async _publishEvent(eventName, userId, storeId, aggregateId, payload) {
        if (!this.eventPublisher) {
            console.warn('[TradeService] EventPublisher not configured. Skipping event emission.');
            return;
        }

        const event = EventContract.create({
            eventType: eventName,
            aggregateId: aggregateId.toString(),
            aggregateType: 'Trade',
            userId,
            storeId,
            payload
        });

        // Publish to appropriate queues based on the event type
        // For Trade events, Reputation and Analytics are primary consumers
        await this.eventPublisher.publish(QUEUES.REPUTATION, event);
    }
}

export default new TradeService();
