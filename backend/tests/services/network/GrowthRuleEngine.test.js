import GrowthRuleEngine from '../../../src/services/network/GrowthRuleEngine.js';

describe('GrowthRuleEngine', () => {
    
    it('should generate prioritized recommendations based on business signals', () => {
        const profile = {
            verified_gst: false,
            annual_turnover: 5000000 // Requires GST
        };

        const signals = {
            dead_stock_value: 60000,
            profile_completeness_pct: 30,
            outstanding_credits: 0,
            late_payments_received: 0
        };

        const recs = GrowthRuleEngine.generateRecommendations(profile, signals);

        expect(recs.length).toBe(3);
        
        // Priority check
        expect(recs[0].category).toBe('COMPLIANCE'); // Priority 100
        expect(recs[1].category).toBe('INVENTORY'); // Priority 80
        expect(recs[2].category).toBe('SALES'); // Priority 60
    });
});
