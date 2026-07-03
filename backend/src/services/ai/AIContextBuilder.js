import BusinessProfileService from '../network/BusinessProfileService.js';
import ReputationService from '../network/ReputationService.js';
import TradeWorkspaceService from '../network/TradeWorkspaceService.js';
import GrowthService from '../network/GrowthService.js';

/**
 * AIContextBuilder
 * Gathers relevant cross-domain state safely to feed into the AI Orchestrator.
 * Crucially limits the context to only what is necessary to reduce token usage and improve focus.
 */
class AIContextBuilder {
    
    async buildFullContext(userId, storeId) {
        // Fetch only the high-level summaries required for Copilot advisory
        const [
            profile,
            reputation,
            tradeWorkspace,
            growthRecommendations
        ] = await Promise.all([
            BusinessProfileService.getProfile(userId),
            ReputationService.getTrustScore(userId),
            TradeWorkspaceService.getWorkspaceOverview(userId, storeId),
            GrowthService.getRecommendations(userId, { limit: 5 }) // Only top 5
        ]);

        return {
            profile: {
                business_name: profile.business_name,
                type: profile.business_type,
                annual_turnover: profile.annual_turnover,
                gst_verified: profile.verified_gst
            },
            reputation: {
                score: reputation.score,
                breakdown: reputation.breakdown
            },
            trade: {
                pending_inbox: tradeWorkspace.inbox.totalPending,
                outstanding_credits_given: tradeWorkspace.credits.given.length, // simplify for example
            },
            growth: growthRecommendations.data.map(r => ({
                title: r.title,
                category: r.category,
                priority: r.priority
            }))
        };
    }
}

export default new AIContextBuilder();
