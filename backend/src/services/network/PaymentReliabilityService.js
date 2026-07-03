import ReputationRepository from '../../repositories/network/ReputationRepository.js';
import EventBus from '../../utils/EventBus.js';

/**
 * PaymentReliabilityService
 * Handles raw metric updates related to payment behaviour.
 */
class PaymentReliabilityService {
    
    async recordLatePayment(userId, daysLate) {
        const metrics = await ReputationRepository.getRawMetrics(userId);
        
        // Exponential moving average for delay to weight recent behavior more heavily, or simple avg
        // For simplicity, using simple moving average approximation
        const newLateCount = metrics.late_payments + 1;
        const newAvg = ((metrics.avg_payment_delay_days * metrics.late_payments) + daysLate) / newLateCount;

        const updated = await ReputationRepository.updateMetrics(userId, {
            late_payments: newLateCount,
            avg_payment_delay_days: newAvg
        });

        await ReputationRepository.logReputationEvent(userId, 'LATE_PAYMENT', -5, { daysLate });

        EventBus.publish('PaymentReliabilityUpdated', { userId, updated });
        return updated;
    }
}

export default new PaymentReliabilityService();
