import ReputationService from '../../services/network/ReputationService.js';
import PaymentReliabilityService from '../../services/network/PaymentReliabilityService.js';
import VerificationService from '../../services/network/VerificationService.js';
import { successResponse, errorResponse } from '../../utils/responseHelper.js';

/**
 * ReputationController
 * HTTP Layer for the Reputation Domain.
 */
class ReputationController {
    
    async getTrustScore(req, res) {
        try {
            // Can check own score or partner's score (if connected, handled in middleware)
            const userId = req.params.userId || req.user.id;
            
            const scoreData = await ReputationService.getTrustScore(userId);
            return successResponse(res, scoreData, 'Trust score fetched successfully');
        } catch (error) {
            console.error('[ReputationController] getTrustScore error:', error);
            return errorResponse(res, 500, 'Failed to fetch trust score');
        }
    }

    async getRawMetrics(req, res) {
        try {
            const userId = req.params.userId || req.user.id;
            const metrics = await ReputationService.getRawMetrics(userId);
            return successResponse(res, metrics, 'Raw metrics fetched successfully');
        } catch (error) {
            console.error('[ReputationController] getRawMetrics error:', error);
            return errorResponse(res, 500, 'Failed to fetch raw metrics');
        }
    }

    async getHistory(req, res) {
        try {
            const userId = req.params.userId || req.user.id;
            const filters = req.query;
            
            const history = await ReputationService.getHistory(userId, filters);
            return successResponse(res, history, 'Reputation history fetched successfully');
        } catch (error) {
            console.error('[ReputationController] getHistory error:', error);
            return errorResponse(res, 500, 'Failed to fetch reputation history');
        }
    }

    async forceRecalculate(req, res) {
        try {
            const userId = req.user.id;
            const newScore = await ReputationService.recalculateReputation(userId);
            return successResponse(res, newScore, 'Reputation recalculated successfully');
        } catch (error) {
            console.error('[ReputationController] forceRecalculate error:', error);
            return errorResponse(res, 500, 'Failed to recalculate reputation');
        }
    }
}

export default new ReputationController();
