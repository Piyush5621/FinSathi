import ReputationRepository from '../../repositories/network/ReputationRepository.js';
import TrustScoreService from './TrustScoreService.js';
import EventBus from '../../utils/EventBus.js';
// Mock Redis cache until fully integrated
// import redisClient from '../../config/redisClient.js';
const redisClient = {
    get: async () => null,
    setEx: async () => true,
    del: async () => true
};

/**
 * ReputationService
 * Orchestrates the Reputation Domain.
 */
class ReputationService {
    
    async getTrustScore(userId) {
        const cacheKey = `trust_score:${userId}`;
        
        // 1. Try Cache
        const cached = await redisClient.get(cacheKey);
        if (cached) return JSON.parse(cached);
        
        // 2. Fetch Raw Metrics
        const metrics = await ReputationRepository.getRawMetrics(userId);
        
        // 3. Calculate Score dynamically
        const result = TrustScoreService.calculateScore(metrics);
        
        const payload = {
            userId,
            score: result.score,
            breakdown: result.breakdown,
            lastCalculated: new Date().toISOString()
        };

        // 4. Cache it (TTL: 1 hour)
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(payload));
        
        return payload;
    }

    async getRawMetrics(userId) {
        return await ReputationRepository.getRawMetrics(userId);
    }

    async getHistory(userId, filters) {
        return await ReputationRepository.getReputationHistory(userId, filters);
    }

    /**
     * Triggered by background jobs when events happen (e.g. TradeCompleted)
     */
    async recalculateReputation(userId) {
        // Invalidate cache
        await redisClient.del(`trust_score:${userId}`);
        
        const newScore = await this.getTrustScore(userId);
        
        EventBus.publish('TrustScoreUpdated', {
            userId,
            score: newScore.score,
            timestamp: new Date().toISOString()
        });
        
        return newScore;
    }
}

export default new ReputationService();
