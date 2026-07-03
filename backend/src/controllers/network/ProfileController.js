import BusinessProfileService from '../../services/network/BusinessProfileService.js';
import { successResponse, errorResponse } from '../../utils/responseHelper.js';

/**
 * ProfileController
 * HTTP Layer for the Business Profile Domain.
 */
class ProfileController {
    
    async getMyProfile(req, res) {
        try {
            const userId = req.user.id;
            const profile = await BusinessProfileService.getProfile(userId);
            
            return successResponse(res, profile, 'Profile fetched successfully');
        } catch (error) {
            console.error('[ProfileController] getMyProfile error:', error);
            return errorResponse(res, 500, 'Failed to fetch business profile');
        }
    }

    async updateMyProfile(req, res) {
        try {
            const userId = req.user.id;
            const updateData = req.body; 
            
            const updatedProfile = await BusinessProfileService.updateProfile(userId, updateData);
            
            return successResponse(res, updatedProfile, 'Profile updated successfully');
        } catch (error) {
            console.error('[ProfileController] updateMyProfile error:', error);
            return errorResponse(res, 500, 'Failed to update business profile');
        }
    }

    async searchProfiles(req, res) {
        try {
            const userId = req.user.id;
            const { q } = req.query;
            
            const profiles = await BusinessProfileService.searchProfiles(userId, q);
            
            return successResponse(res, profiles, 'Profiles fetched successfully');
        } catch (error) {
            console.error('[ProfileController] searchProfiles error:', error);
            return errorResponse(res, 500, 'Failed to search business profiles');
        }
    }
}

export default new ProfileController();
