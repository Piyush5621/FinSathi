import { supabase } from '../../config/db.js';

/**
 * ReputationRepository
 * Data Access Layer for the Reputation Domain.
 * Only responsible for executing SQL against the raw metrics and history tables.
 */
class ReputationRepository {
    
    async getRawMetrics(userId) {
        const { data, error } = await supabase
            .from('business_reputation_metrics')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // Ignore not found error
            throw error;
        }

        // Return default empty metrics if not found
        return data || {
            user_id: userId,
            completed_trades: 0,
            cancelled_trades: 0,
            disputes_raised: 0,
            disputes_lost: 0,
            late_payments: 0,
            avg_payment_delay_days: 0.0,
            response_rate_pct: 0,
            gst_verified: false,
            profile_completeness_pct: 0,
            connection_acceptance_rate_pct: 0,
            review_count: 0,
            review_average: 0.0
        };
    }

    async updateMetrics(userId, updates) {
        const payload = {
            user_id: userId,
            ...updates,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('business_reputation_metrics')
            .upsert(payload, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async logReputationEvent(userId, eventType, impactScore, context = {}) {
        const { data, error } = await supabase
            .from('business_reputation_history')
            .insert({
                user_id: userId,
                event_type: eventType,
                impact_score: impactScore,
                context
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getReputationHistory(userId, { page = 1, limit = 20 } = {}) {
        const offset = (page - 1) * limit;
        
        const { data, count, error } = await supabase
            .from('business_reputation_history')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return { data, total: count, page, limit };
    }
}

export default new ReputationRepository();
