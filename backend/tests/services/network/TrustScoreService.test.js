import TrustScoreService from '../../../src/services/network/TrustScoreService.js';

describe('TrustScoreService', () => {
    
    it('should calculate a perfect 100 score for flawless metrics', () => {
        const perfectMetrics = {
            completed_trades: 100,
            cancelled_trades: 0,
            disputes_raised: 0,
            disputes_lost: 0,
            late_payments: 0,
            avg_payment_delay_days: 0.0,
            response_rate_pct: 100,
            gst_verified: true,
            profile_completeness_pct: 100,
            connection_acceptance_rate_pct: 100
        };

        const result = TrustScoreService.calculateScore(perfectMetrics);
        
        expect(result.score).toBe(100);
        expect(result.breakdown.tradeReliability).toBe(40);
        expect(result.breakdown.paymentReliability).toBe(30);
        expect(result.breakdown.verification).toBe(20);
        expect(result.breakdown.engagement).toBe(10);
    });

    it('should calculate a baseline score for a new user with no history', () => {
        const newMetrics = {
            completed_trades: 0,
            cancelled_trades: 0,
            disputes_raised: 0,
            disputes_lost: 0,
            late_payments: 0,
            avg_payment_delay_days: 0.0,
            response_rate_pct: 0,
            gst_verified: false,
            profile_completeness_pct: 0,
            connection_acceptance_rate_pct: 0
        };

        const result = TrustScoreService.calculateScore(newMetrics);
        
        // Baseline: 20 (Trade) + 15 (Payment) + 0 + 0 = 35
        expect(result.score).toBe(35);
        expect(result.breakdown.tradeReliability).toBe(20);
        expect(result.breakdown.paymentReliability).toBe(15);
    });

    it('should heavily penalize late payments and disputes', () => {
        const badMetrics = {
            completed_trades: 10,
            cancelled_trades: 5,
            disputes_raised: 0,
            disputes_lost: 5, // 10 / 20 = 50% success rate -> 20 points
            late_payments: 10, // Penalty: 20
            avg_payment_delay_days: 15, // Penalty: 7.5 (Total Penalty: 27.5, Payment Reliability = 30 - 27.5 = 2.5)
            response_rate_pct: 50,
            gst_verified: false,
            profile_completeness_pct: 50,
            connection_acceptance_rate_pct: 50
        };

        const result = TrustScoreService.calculateScore(badMetrics);
        
        expect(result.breakdown.tradeReliability).toBe(20);
        expect(result.breakdown.paymentReliability).toBe(3); // Math.round(2.5)
        expect(result.breakdown.verification).toBe(5);
        expect(result.breakdown.engagement).toBe(5);
        
        expect(result.score).toBe(33); 
    });
});
