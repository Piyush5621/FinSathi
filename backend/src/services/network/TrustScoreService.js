/**
 * TrustScoreService
 * Business Logic Layer for calculating the Trust Score based on raw metrics.
 * 
 * Score components:
 * - Trade Reliability (40% weight): completed trades vs cancelled/disputes
 * - Payment Reliability (30% weight): late payments and avg delay
 * - Profile & Verification (20% weight): GST, profile completeness
 * - Engagement (10% weight): Response rate, connection acceptance
 */
class TrustScoreService {
    
    /**
     * Calculates a Trust Score (0-100) from raw metrics.
     * @param {Object} metrics - Raw metrics from business_reputation_metrics
     * @returns {Object} { score, breakdown }
     */
    calculateScore(metrics) {
        let score = 0;
        
        // 1. Trade Reliability (Max 40 points)
        const tradeReliability = this._calcTradeReliability(metrics);
        score += tradeReliability;
        
        // 2. Payment Reliability (Max 30 points)
        const paymentReliability = this._calcPaymentReliability(metrics);
        score += paymentReliability;
        
        // 3. Profile & Verification (Max 20 points)
        const verificationScore = this._calcVerificationScore(metrics);
        score += verificationScore;
        
        // 4. Engagement (Max 10 points)
        const engagementScore = this._calcEngagementScore(metrics);
        score += engagementScore;
        
        // Ensure bounds
        const finalScore = Math.max(0, Math.min(100, Math.round(score)));

        return {
            score: finalScore,
            breakdown: {
                tradeReliability: Math.round(tradeReliability),
                paymentReliability: Math.round(paymentReliability),
                verification: Math.round(verificationScore),
                engagement: Math.round(engagementScore)
            }
        };
    }

    _calcTradeReliability(metrics) {
        // Base 40. Deduct for disputes and cancellations.
        // If completed trades is 0, give baseline 20.
        if (metrics.completed_trades === 0 && metrics.cancelled_trades === 0 && metrics.disputes_raised === 0) {
            return 20; // Neutral start
        }

        const totalInteractions = metrics.completed_trades + metrics.cancelled_trades + metrics.disputes_lost;
        if (totalInteractions === 0) return 20;

        const successRate = metrics.completed_trades / totalInteractions;
        return 40 * successRate; // max 40
    }

    _calcPaymentReliability(metrics) {
        // Base 30. Penalty for late payments and high avg delay.
        // If no data, baseline 15.
        if (metrics.late_payments === 0 && metrics.avg_payment_delay_days === 0) {
            return 15; // Neutral start
        }

        let penalty = (metrics.late_payments * 2) + (metrics.avg_payment_delay_days * 0.5);
        return Math.max(0, 30 - penalty);
    }

    _calcVerificationScore(metrics) {
        let score = 0;
        if (metrics.gst_verified) score += 10;
        
        // Profile completeness (up to 10 points)
        score += (metrics.profile_completeness_pct / 100) * 10;
        
        return score; // max 20
    }

    _calcEngagementScore(metrics) {
        let score = 0;
        // Response rate (up to 5 points)
        score += (metrics.response_rate_pct / 100) * 5;
        // Connection acceptance (up to 5 points)
        score += (metrics.connection_acceptance_rate_pct / 100) * 5;
        
        return score; // max 10
    }
}

export default new TrustScoreService();
