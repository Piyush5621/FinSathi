import { supabase } from '../../config/db.js';

/**
 * BusinessProfileRepository
 * Data Access Layer for the Business Profile Domain.
 */
class BusinessProfileRepository {
    
    async getProfileByUserId(userId) {
        const { data, error } = await supabase
            .from('business_network_profiles')
            .select(`
                *,
                users:user_id (
                    name,
                    business_name,
                    business_type,
                    city,
                    state,
                    gstin,
                    logo_url
                )
            `)
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        return data;
    }

    async upsertProfile(userId, profileData) {
        const payload = {
            user_id: userId,
            ...profileData,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('business_network_profiles')
            .upsert(payload, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async logAuditAction(userId, domain, eventType, details = {}, ipAddress = null) {
        const { error } = await supabase
            .from('business_network_audit_logs')
            .insert({
                user_id: userId,
                domain,
                event_type: eventType,
                details,
                ip_address: ipAddress
            });

        if (error) throw error;
        return true;
    }

    async searchProfiles(userId, query) {
        let sql = supabase
            .from('users')
            .select(`
                id,
                name,
                business_name,
                business_type,
                city,
                state,
                gstin,
                logo_url,
                business_network_profiles (
                    verified_gst,
                    profile_completeness_pct,
                    year_established,
                    about_text,
                    trade_volume_bracket,
                    website_url
                )
            `)
            .neq('id', userId);

        if (query) {
             sql = sql.or(`business_name.ilike.%${query}%,city.ilike.%${query}%,state.ilike.%${query}%`);
        }

        const { data, error } = await sql.limit(50);
        if (error) throw error;
        
        return data.map(u => ({
            id: u.id,
            name: u.business_name, // Mapping for frontend
            type: u.business_type,
            location: `${u.city || ''}, ${u.state || ''}`.replace(/^, | , $/g, '').trim(),
            verified: u.business_network_profiles?.[0]?.verified_gst || false,
            tags: [u.business_type, u.business_network_profiles?.[0]?.trade_volume_bracket].filter(Boolean),
            rating: (Math.random() * (5 - 3.5) + 3.5).toFixed(1), // Mock rating until reputation logic returns
            completeness: u.business_network_profiles?.[0]?.profile_completeness_pct || 0
        }));
    }
}

export default new BusinessProfileRepository();
