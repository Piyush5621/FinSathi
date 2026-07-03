import { supabase } from '../../config/db.js';

/**
 * MarketplaceRepository
 * Data Access Layer for the Marketplace Domain.
 */
class MarketplaceRepository {
    
    async getListings(filters = {}) {
        let query = supabase
            .from('business_exchange_listings')
            .select(`
                *,
                user:user_id (id, business_name, city, state, logo_url)
            `)
            .eq('status', 'ACTIVE');

        if (filters.listing_type) {
            query = query.eq('listing_type', filters.listing_type);
        }
        
        // Sorting
        query = query.order('created_at', { ascending: false });
        
        const { data, error } = await query;
        if (error) throw error;
        
        return data;
    }

    async createListing(userId, listingData) {
        const payload = {
            user_id: userId,
            ...listingData,
            status: 'ACTIVE'
        };

        const { data, error } = await supabase
            .from('business_exchange_listings')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getListingById(id) {
        const { data, error } = await supabase
            .from('business_exchange_listings')
            .select('*')
            .eq('id', id)
            .single();
            
        if (error) throw error;
        return data;
    }

    async updateListingStatus(id, status) {
        const { data, error } = await supabase
            .from('business_exchange_listings')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }
}

export default new MarketplaceRepository();
