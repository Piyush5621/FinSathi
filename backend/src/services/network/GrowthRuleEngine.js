/**
 * GrowthRuleEngine
 * Analyzes business signals and generates ranked recommendations.
 */
class GrowthRuleEngine {
    
    /**
     * Generate recommendations based on business signals
     * @param {Object} profile - Business Profile
     * @param {Object} signals - Inventory status, sales velocity, reputation metrics
     * @returns {Array} List of prioritized recommendations
     */
    generateRecommendations(profile, signals) {
        const recommendations = [];

        // Rule 1: Compliance
        if (!profile.verified_gst && profile.annual_turnover > 4000000) {
            recommendations.push({
                category: 'COMPLIANCE',
                priority: 100, // Highest
                title: 'GST Registration Required',
                description: 'Your estimated turnover exceeds the 40L threshold. Register for GST to avoid penalties.'
            });
        }

        // Rule 2: Inventory Dead Stock
        if (signals.dead_stock_value > 50000) {
            recommendations.push({
                category: 'INVENTORY',
                priority: 80,
                title: 'Liquidate Dead Stock',
                description: `You have over ₹${signals.dead_stock_value} locked in non-moving inventory. Post it on the Business Exchange.`
            });
        }

        // Rule 3: Trade Profile Completeness
        if (signals.profile_completeness_pct < 50) {
            recommendations.push({
                category: 'SALES',
                priority: 60,
                title: 'Complete Your Business Profile',
                description: 'Profiles with logos and catalogs receive 3x more trade requests.'
            });
        }
        
        // Rule 4: High AR (Accounts Receivable)
        if (signals.outstanding_credits > 100000 && signals.late_payments_received > 5) {
            recommendations.push({
                category: 'TAX', // Or FINANCE
                priority: 90,
                title: 'Automate Payment Reminders',
                description: 'You have significant outstanding credit. Enable automated WhatsApp reminders to improve cash flow.'
            });
        }

        // Sort by priority descending
        return recommendations.sort((a, b) => b.priority - a.priority);
    }
}

export default new GrowthRuleEngine();
