import { supabase } from '../../config/db.js';

/**
 * PartnerRepository
 * Data Access Layer for the Partner Domain.
 * Manages connections, connection requests, and partner catalogs.
 */
class PartnerRepository {
    
    async getConnections(userId) {
        // Fetch where user is requester or receiver and status is 'accepted'
        const { data, error } = await supabase
            .from('business_connections')
            .select(`
                *,
                requester:requester_id (id, business_name, city, state, logo_url),
                receiver:receiver_id (id, business_name, city, state, logo_url)
            `)
            .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
            .eq('status', 'accepted');

        if (error) throw error;
        return data;
    }

    async getPendingRequests(userId) {
        // Fetch requests received by user
        const { data, error } = await supabase
            .from('business_connections')
            .select(`
                *,
                requester:requester_id (id, business_name, city, state, logo_url)
            `)
            .eq('receiver_id', userId)
            .eq('status', 'pending');

        if (error) throw error;
        return data;
    }

    async upsertConnectionRequest(requesterId, receiverId, connectionType) {
        const { data, error } = await supabase
            .from('business_connections')
            .upsert({
                requester_id: requesterId,
                receiver_id: receiverId,
                status: 'pending',
                connection_type: connectionType,
                updated_at: new Date().toISOString()
            }, { onConflict: 'requester_id,receiver_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateConnectionStatus(connectionId, status) {
        const { data, error } = await supabase
            .from('business_connections')
            .update({ status, connected_at: status === 'accepted' ? new Date().toISOString() : null })
            .eq('id', connectionId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

export default new PartnerRepository();
