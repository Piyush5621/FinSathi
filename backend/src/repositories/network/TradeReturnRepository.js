import { supabase } from '../../config/db.js';

/**
 * TradeReturnRepository
 * Data Access Layer for Trade Returns.
 */
class TradeReturnRepository {
    
    async getReturns(userId, storeId, { page = 1, limit = 20, type = 'all' } = {}) {
        const offset = (page - 1) * limit;
        
        let query = supabase
            .from('trade_returns')
            .select(`
                *,
                buyer:buyer_id (id, business_name, city, state, logo_url),
                seller:seller_id (id, business_name, city, state, logo_url),
                items:trade_return_items(*)
            `, { count: 'exact' });

        if (type === 'incoming') {
            query = query.eq('seller_id', userId);
        } else if (type === 'outgoing') {
            query = query.eq('buyer_id', userId);
        } else {
            query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
        }

        query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

        const { data, count, error } = await query;
        if (error) throw error;
        return { data, total: count, page, limit };
    }

    async createReturn(returnData, itemsData) {
        const { data: tradeReturn, error: returnError } = await supabase
            .from('trade_returns')
            .insert(returnData)
            .select()
            .single();

        if (returnError) throw returnError;

        const itemsWithReturnId = itemsData.map(item => ({
            ...item,
            return_id: tradeReturn.id
        }));

        const { data: items, error: itemsError } = await supabase
            .from('trade_return_items')
            .insert(itemsWithReturnId)
            .select();

        if (itemsError) throw itemsError;

        return { ...tradeReturn, items };
    }
}

export default new TradeReturnRepository();
