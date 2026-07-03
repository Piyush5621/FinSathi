import { supabase } from '../../config/db.js';

/**
 * CatalogRepository
 * Data Access Layer for Partner Catalogs.
 */
class CatalogRepository {
    
    async getCatalog(partnerId, storeId, { page = 1, limit = 20 } = {}) {
        const offset = (page - 1) * limit;
        
        // Find the active catalog for the partner
        const { data: catalog, error: catalogError } = await supabase
            .from('partner_catalogs')
            .select('id')
            .eq('partner_id', partnerId)
            .eq('status', 'active')
            .single();
            
        if (catalogError || !catalog) {
            return { data: [], total: 0, page, limit };
        }

        const { data, count, error } = await supabase
            .from('partner_catalog_items')
            .select('*', { count: 'exact' })
            .eq('catalog_id', catalog.id)
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return { data, total: count, page, limit };
    }
}

export default new CatalogRepository();
