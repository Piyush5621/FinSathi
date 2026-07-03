import ReputationRepository from '../../repositories/network/ReputationRepository.js';
import EventBus from '../../utils/EventBus.js';

/**
 * VerificationService
 * Handles raw metric updates related to business verifications (GST, etc.)
 */
class VerificationService {
    
    async verifyGST(userId, gstNumber) {
        // Mock GST API call logic would go here
        
        const updated = await ReputationRepository.updateMetrics(userId, {
            gst_verified: true
        });

        await ReputationRepository.logReputationEvent(userId, 'GST_VERIFIED', 10, { gstNumber });

        EventBus.publish('VerificationCompleted', { userId, type: 'GST', updated });
        return updated;
    }
}

export default new VerificationService();
