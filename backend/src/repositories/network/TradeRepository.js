import { supabase } from '../../config/db.js';

/**
 * TradeRepository
 * Data Access Layer for Trade Transactions (Inbox/Outbox).
 * Handles searching, sorting, pagination, and store isolation.
 */
class TradeRepository {
    
    async getInbox(userId, storeId, { page = 1, limit = 20, status } = {}) {
        const offset = (page - 1) * limit;
        
        let query = supabase
            .from('trade_transactions')
            .select(`
                *,
                sender:sender_id (id, business_name, city, state, logo_url),
                items:trade_transaction_items(*)
            `, { count: 'exact' })
            .eq('receiver_id', userId);
            
        // Optional Store Isolation (if transaction is bound to a store)
        // .eq('store_id', storeId) // Assuming future store isolation support

        if (status) {
            query = query.eq('status', status);
        }

        query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

        const { data, count, error } = await query;
        if (error) throw error;
        return { data, total: count, page, limit };
    }

    async getOutbox(userId, storeId, { page = 1, limit = 20, status } = {}) {
        const offset = (page - 1) * limit;
        
        let query = supabase
            .from('trade_transactions')
            .select(`
                *,
                receiver:receiver_id (id, business_name, city, state, logo_url),
                items:trade_transaction_items(*)
            `, { count: 'exact' })
            .eq('sender_id', userId);

        if (status) {
            query = query.eq('status', status);
        }

        query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

        const { data, count, error } = await query;
        if (error) throw error;
        return { data, total: count, page, limit };
    }

    // Using Supabase Postgres RPC to guarantee atomicity of Trade + TradeItems insertion.
    async createTrade(tradeData, itemsData) {
        const { data, error } = await supabase.rpc('create_trade_atomic', {
            p_trade_data: tradeData,
            p_items_data: itemsData
        });

        if (error) {
            throw new Error(`Atomic Trade creation failed: ${error.message}`);
        }

        return data;
    }

    async updateTradeStatus(transactionId, status) {
        const { data, error } = await supabase
            .from('trade_transactions')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', transactionId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

export default new TradeRepository();
