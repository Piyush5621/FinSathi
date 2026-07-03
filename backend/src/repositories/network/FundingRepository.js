import { supabase } from '../../config/db.js';

/**
 * FundingRepository
 * Data Access Layer for Funding Programs (Loans, Grants).
 */
class FundingRepository {
    
    async getActiveFundingPrograms() {
        const { data, error } = await supabase
            .from('growth_opportunities')
            .select('*')
            .eq('type', 'FUNDING_PROGRAM')
            .eq('status', 'ACTIVE');

        if (error) throw error;
        return data;
    }
}

export default new FundingRepository();
