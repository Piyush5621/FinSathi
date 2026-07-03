import BusinessProfileService from '../../../src/services/network/BusinessProfileService.js';
import BusinessProfileRepository from '../../../src/repositories/network/BusinessProfileRepository.js';
import EventBus from '../../../src/utils/EventBus.js';

// Mock dependencies
jest.mock('../../../src/repositories/network/BusinessProfileRepository.js');
jest.mock('../../../src/utils/EventBus.js');

describe('BusinessProfileService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should calculate completeness score correctly on update', async () => {
        const userId = '123-uuid';
        const updateData = {
            about_text: 'We are a great company', // +20
            year_established: 2020, // +20
            verified_gst: true // +30
        };

        BusinessProfileRepository.upsertProfile.mockResolvedValue({ ...updateData, user_id: userId, profile_completeness_pct: 70 });
        BusinessProfileRepository.logAuditAction.mockResolvedValue(true);

        const result = await BusinessProfileService.updateProfile(userId, updateData);

        expect(result.profile_completeness_pct).toBe(70);
        expect(BusinessProfileRepository.upsertProfile).toHaveBeenCalledWith(userId, updateData);
        expect(EventBus.publish).toHaveBeenCalledWith('ProfileUpdated', expect.objectContaining({ userId, completeness: 70 }));
        expect(BusinessProfileRepository.logAuditAction).toHaveBeenCalled();
    });
});
