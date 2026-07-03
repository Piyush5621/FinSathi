/**
 * EligibilityEngine
 * Evaluates business profiles against hardcoded/configured rules for schemes and funding.
 * AI does NOT run these checks; it only explains the result.
 */
class EligibilityEngine {
    
    /**
     * @param {Object} businessProfile 
     * @param {Object} metrics (Trust score, revenue, etc.)
     * @param {Array} opportunities 
     * @returns {Array} List of matched opportunities with eligibility details
     */
    evaluate(businessProfile, metrics, opportunities) {
        return opportunities.map(opp => {
            const result = this._checkRules(businessProfile, metrics, opp.eligibility_criteria);
            return {
                ...opp,
                isEligible: result.isEligible,
                reasons: result.reasons // Why they passed or failed (for AI to explain later)
            };
        });
    }

    _checkRules(profile, metrics, criteria) {
        const reasons = [];
        let isEligible = true;

        // Example Rule: Minimum Trust Score
        if (criteria.min_trust_score) {
            if (metrics.trust_score >= criteria.min_trust_score) {
                reasons.push(`Trust score is ${metrics.trust_score}, meeting the minimum of ${criteria.min_trust_score}.`);
            } else {
                isEligible = false;
                reasons.push(`Trust score is ${metrics.trust_score}, which is below the required ${criteria.min_trust_score}.`);
            }
        }

        // Example Rule: Must be GST Verified
        if (criteria.require_gst) {
            if (profile.verified_gst) {
                reasons.push(`Business is GST verified.`);
            } else {
                isEligible = false;
                reasons.push(`GST verification is required for this program.`);
            }
        }

        // Example Rule: Minimum Years in Business
        if (criteria.min_years_active) {
            const currentYear = new Date().getFullYear();
            const yearsActive = currentYear - (profile.year_established || currentYear);
            if (yearsActive >= criteria.min_years_active) {
                reasons.push(`Business has been active for ${yearsActive} years, meeting the requirement of ${criteria.min_years_active} years.`);
            } else {
                isEligible = false;
                reasons.push(`Requires ${criteria.min_years_active} years in business, but currently at ${yearsActive}.`);
            }
        }

        return { isEligible, reasons };
    }
}

export default new EligibilityEngine();
