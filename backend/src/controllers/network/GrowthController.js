import GrowthService from '../../services/network/GrowthService.js';
import { successResponse, errorResponse } from '../../utils/responseHelper.js';

/**
 * GrowthController
 * HTTP Layer for the Growth Domain.
 */
class GrowthController {
    
    async getRecommendations(req, res) {
        try {
            const userId = req.user.id;
            const filters = req.query; // status, page, limit
            
            const recs = await GrowthService.getRecommendations(userId, filters);
            return successResponse(res, recs, 'Growth recommendations fetched successfully');
        } catch (error) {
            console.error('[GrowthController] getRecommendations error:', error);
            return errorResponse(res, 500, 'Failed to fetch recommendations');
        }
    }

    async getSchemes(req, res) {
        try {
            const userId = req.user.id;
            // In a real flow, fetch user profile and metrics first.
            // Using mocks for demonstration of architecture.
            const mockProfile = { verified_gst: true, year_established: 2020 };
            const mockMetrics = { trust_score: 85 };
            
            const schemes = await GrowthService.getEligibleSchemes(userId, mockProfile, mockMetrics);
            return successResponse(res, schemes, 'Eligible schemes fetched successfully');
        } catch (error) {
            console.error('[GrowthController] getSchemes error:', error);
            return errorResponse(res, 500, 'Failed to fetch schemes');
        }
    }

    async getFunding(req, res) {
        try {
            const userId = req.user.id;
            const mockProfile = { verified_gst: true, year_established: 2018 };
            const mockMetrics = { trust_score: 90 };
            
            const funding = await GrowthService.getEligibleFunding(userId, mockProfile, mockMetrics);
            return successResponse(res, funding, 'Eligible funding programs fetched successfully');
        } catch (error) {
            console.error('[GrowthController] getFunding error:', error);
            return errorResponse(res, 500, 'Failed to fetch funding programs');
        }
    }

    async getMilestones(req, res) {
        try {
            const userId = req.user.id;
            
            const milestones = await GrowthService.getMilestones(userId);
            return successResponse(res, milestones, 'Business milestones fetched successfully');
        } catch (error) {
            console.error('[GrowthController] getMilestones error:', error);
            return errorResponse(res, 500, 'Failed to fetch milestones');
        }
    }
}

export default new GrowthController();
