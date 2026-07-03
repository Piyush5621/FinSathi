import { supabase } from '../../config/db.js';

/**
 * TradeCreditRepository
 * Data Access Layer for Trade Credits.
 */
class TradeCreditRepository {
    
    async getCreditsGiven(userId, storeId, { page = 1, limit = 20 } = {}) {
        const offset = (page - 1) * limit;
        
        const { data, count, error } = await supabase
            .from('trade_credit_accounts')
            .select(`
                *,
                borrower:borrower_id (id, business_name, city, state, logo_url)
            `, { count: 'exact' })
            .eq('lender_id', userId)
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return { data, total: count, page, limit };
    }

    async getCreditsReceived(userId, storeId, { page = 1, limit = 20 } = {}) {
        const offset = (page - 1) * limit;
        
        const { data, count, error } = await supabase
            .from('trade_credit_accounts')
            .select(`
                *,
                lender:lender_id (id, business_name, city, state, logo_url)
            `, { count: 'exact' })
            .eq('borrower_id', userId)
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return { data, total: count, page, limit };
    }

    async upsertCreditLimit(lenderId, borrowerId, creditLimit, terms = 30) {
        const payload = {
            lender_id: lenderId,
            borrower_id: borrowerId,
            credit_limit: creditLimit,
            credit_terms_days: terms,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('trade_credit_accounts')
            .upsert(payload, { onConflict: 'lender_id,borrower_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

export default new TradeCreditRepository();
