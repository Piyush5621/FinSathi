import PartnerRepository from '../../repositories/network/PartnerRepository.js';
import EventBus from '../../utils/EventBus.js';

/**
 * PartnerService
 * Business Logic Layer for the Partner Domain.
 */
class PartnerService {
    
    async getConnections(userId) {
        const rawConnections = await PartnerRepository.getConnections(userId);
        
        // Map data to a unified format so the frontend doesn't need to know if 
        // the user was the requester or receiver
        return rawConnections.map(conn => {
            const isRequester = conn.requester_id === userId;
            const partner = isRequester ? conn.receiver : conn.requester;
            return {
                connection_id: conn.id,
                connection_type: conn.connection_type,
                trade_volume: conn.trade_volume,
                connected_at: conn.connected_at,
                partner
            };
        });
    }

    async getPendingRequests(userId) {
        return await PartnerRepository.getPendingRequests(userId);
    }

    async sendConnectionRequest(requesterId, receiverId, connectionType) {
        if (requesterId === receiverId) {
            throw new Error("Cannot connect with yourself");
        }

        const request = await PartnerRepository.upsertConnectionRequest(requesterId, receiverId, connectionType);
        
        EventBus.publish('ConnectionRequested', {
            requesterId,
            receiverId,
            connectionType,
            timestamp: new Date()
        });

        return request;
    }

    async respondToRequest(userId, connectionId, status) {
        if (!['accepted', 'rejected'].includes(status)) {
            throw new Error("Invalid status");
        }

        const updated = await PartnerRepository.updateConnectionStatus(connectionId, status);
        
        if (status === 'accepted') {
            EventBus.publish('BusinessConnected', {
                connectionId,
                requesterId: updated.requester_id,
                receiverId: updated.receiver_id,
                timestamp: new Date()
            });
        }

        return updated;
    }
}

export default new PartnerService();
