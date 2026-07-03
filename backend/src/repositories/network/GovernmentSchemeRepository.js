import { supabase } from '../../config/db.js';

/**
 * GovernmentSchemeRepository
 * Data Access Layer for Government Schemes.
 */
class GovernmentSchemeRepository {
    
    async getActiveSchemes() {
        const { data, error } = await supabase
            .from('growth_opportunities')
            .select('*')
            .eq('type', 'GOVERNMENT_SCHEME')
            .eq('status', 'ACTIVE');

        if (error) throw error;
        return data;
    }
}

export default new GovernmentSchemeRepository();
