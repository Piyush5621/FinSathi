import { EventEmitter } from 'events';

/**
 * EventBus.js
 * 
 * Central Event Emitter for Domain-Driven Architecture.
 * Allows decoupling of business domains (e.g., Profile, Partner, Marketplace)
 * so that they can communicate without direct dependencies.
 */
class DomainEventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50);
    }

    publish(eventName, payload) {
        try {
            this.emit(eventName, payload);
        } catch (error) {
            console.error(`[EventBus] Error publishing event ${eventName}:`, error);
        }
    }
}

const EventBus = new DomainEventBus();
export default EventBus;
