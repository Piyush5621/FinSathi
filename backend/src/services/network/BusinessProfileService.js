import BusinessProfileRepository from '../../repositories/network/BusinessProfileRepository.js';
import EventBus from '../../utils/EventBus.js';

/**
 * BusinessProfileService
 * Business Logic Layer for the Business Profile Domain.
 */
class BusinessProfileService {
    
    async getProfile(userId) {
        let profile = await BusinessProfileRepository.getProfileByUserId(userId);
        
        if (!profile) {
            profile = {
                user_id: userId,
                verified_gst: false,
                profile_completeness_pct: 0,
                about_text: null,
                trade_volume_bracket: null
            };
        }
        
        return profile;
    }

    async updateProfile(userId, updateData) {
        const completeness = this._calculateCompleteness(updateData);
        updateData.profile_completeness_pct = completeness;

        const updatedProfile = await BusinessProfileRepository.upsertProfile(userId, updateData);
        
        EventBus.publish('ProfileUpdated', {
            userId,
            completeness,
            timestamp: new Date()
        });

        await BusinessProfileRepository.logAuditAction(
            userId, 
            'Profile', 
            'ProfileUpdated', 
            { updatedFields: Object.keys(updateData) }
        );

        return updatedProfile;
    }

    _calculateCompleteness(data) {
        let score = 0;
        if (data.about_text) score += 20;
        if (data.year_established) score += 20;
        if (data.website_url) score += 10;
        if (data.trade_volume_bracket) score += 20;
        if (data.verified_gst) score += 30;
        return Math.min(score, 100);
    }

    async searchProfiles(userId, query) {
        return await BusinessProfileRepository.searchProfiles(userId, query);
    }
}

export default new BusinessProfileService();
