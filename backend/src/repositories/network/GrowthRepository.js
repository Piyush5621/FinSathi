import { supabase } from '../../config/db.js';

/**
 * GrowthRepository
 * General data access for Business Milestones.
 */
class GrowthRepository {
    
    async getMilestones(userId) {
        const { data, error } = await supabase
            .from('business_milestones')
            .select('*')
            .eq('user_id', userId)
            .order('achieved_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    async addMilestone(userId, milestoneType, context = {}) {
        const { data, error } = await supabase
            .from('business_milestones')
            .insert({
                user_id: userId,
                milestone_type: milestoneType,
                context
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

export default new GrowthRepository();
