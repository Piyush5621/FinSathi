import EligibilityEngine from '../../../src/services/network/EligibilityEngine.js';

describe('EligibilityEngine', () => {
    
    it('should correctly evaluate scheme eligibility based on rules', () => {
        const businessProfile = {
            verified_gst: true,
            year_established: 2020
        };

        const metrics = {
            trust_score: 85
        };

        const schemes = [
            {
                id: 's1',
                name: 'High Trust Loan',
                eligibility_criteria: { min_trust_score: 80, require_gst: true }
            },
            {
                id: 's2',
                name: 'Legacy Business Grant',
                eligibility_criteria: { min_years_active: 10 }
            }
        ];

        const evaluated = EligibilityEngine.evaluate(businessProfile, metrics, schemes);

        expect(evaluated[0].isEligible).toBe(true);
        expect(evaluated[0].reasons).toContain('Trust score is 85, meeting the minimum of 80.');

        expect(evaluated[1].isEligible).toBe(false);
    });
});
