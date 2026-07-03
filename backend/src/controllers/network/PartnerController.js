import PartnerService from '../../services/network/PartnerService.js';
import { successResponse, errorResponse } from '../../utils/responseHelper.js';

/**
 * PartnerController
 * HTTP Layer for the Partner Domain.
 */
class PartnerController {
    
    async getConnections(req, res) {
        try {
            const userId = req.user.id;
            const connections = await PartnerService.getConnections(userId);
            return successResponse(res, connections, 'Connections fetched successfully');
        } catch (error) {
            console.error('[PartnerController] getConnections error:', error);
            return errorResponse(res, 500, 'Failed to fetch connections');
        }
    }

    async getPendingRequests(req, res) {
        try {
            const userId = req.user.id;
            const requests = await PartnerService.getPendingRequests(userId);
            return successResponse(res, requests, 'Pending requests fetched successfully');
        } catch (error) {
            console.error('[PartnerController] getPendingRequests error:', error);
            return errorResponse(res, 500, 'Failed to fetch pending requests');
        }
    }

    async sendRequest(req, res) {
        try {
            const requesterId = req.user.id;
            const { receiverId, connectionType } = req.body;
            
            const request = await PartnerService.sendConnectionRequest(requesterId, receiverId, connectionType || 'Partner');
            return successResponse(res, request, 'Connection request sent successfully');
        } catch (error) {
            console.error('[PartnerController] sendRequest error:', error);
            return errorResponse(res, 400, error.message || 'Failed to send connection request');
        }
    }

    async respondRequest(req, res) {
        try {
            const userId = req.user.id; // Usually we'd verify receiver == userId, handled in deeper layers if needed
            const { connectionId } = req.params;
            const { status } = req.body; // 'accepted' or 'rejected'
            
            const updated = await PartnerService.respondToRequest(userId, connectionId, status);
            return successResponse(res, updated, `Connection request ${status}`);
        } catch (error) {
            console.error('[PartnerController] respondRequest error:', error);
            return errorResponse(res, 400, error.message || 'Failed to respond to request');
        }
    }
}

export default new PartnerController();
