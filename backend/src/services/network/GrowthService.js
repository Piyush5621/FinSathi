import GrowthRepository from '../../repositories/network/GrowthRepository.js';
import GovernmentSchemeRepository from '../../repositories/network/GovernmentSchemeRepository.js';
import FundingRepository from '../../repositories/network/FundingRepository.js';
import GrowthRecommendationRepository from '../../repositories/network/GrowthRecommendationRepository.js';
import EligibilityEngine from './EligibilityEngine.js';
import GrowthRuleEngine from './GrowthRuleEngine.js';
import EventBus from '../../utils/EventBus.js';

/**
 * GrowthService
 * Orchestrates the Growth Intelligence Engine.
 */
class GrowthService {
    
    async getRecommendations(userId, filters) {
        return await GrowthRecommendationRepository.getRecommendations(userId, filters);
    }

    async getEligibleSchemes(userId, businessProfile, metrics) {
        const schemes = await GovernmentSchemeRepository.getActiveSchemes();
        const evaluated = EligibilityEngine.evaluate(businessProfile, metrics, schemes);
        // Only return eligible ones, or return all with eligibility flags
        return evaluated.filter(s => s.isEligible);
    }

    async getEligibleFunding(userId, businessProfile, metrics) {
        const funding = await FundingRepository.getActiveFundingPrograms();
        const evaluated = EligibilityEngine.evaluate(businessProfile, metrics, funding);
        return evaluated.filter(s => s.isEligible);
    }

    async getMilestones(userId) {
        return await GrowthRepository.getMilestones(userId);
    }

    /**
     * Background Job Trigger: Refresh Recommendations
     * This evaluates business signals and upserts recommendations.
     */
    async refreshRecommendations(userId, businessProfile, signals) {
        const newRecs = GrowthRuleEngine.generateRecommendations(businessProfile, signals);
        
        const upsertPromises = newRecs.map(async (rec) => {
            const saved = await GrowthRecommendationRepository.upsertRecommendation(userId, rec);
            
            EventBus.publish('RecommendationGenerated', {
                userId,
                recommendationId: saved.id,
                category: saved.category,
                timestamp: new Date().toISOString()
            });
            
            return saved;
        });

        return await Promise.all(upsertPromises);
    }
}

export default new GrowthService();
