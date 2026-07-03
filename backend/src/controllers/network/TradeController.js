import TradeService from '../../services/network/TradeService.js';
import TradeWorkspaceService from '../../services/network/TradeWorkspaceService.js';
import { successResponse, errorResponse } from '../../utils/responseHelper.js';

/**
 * TradeController
 * HTTP Layer for the Trade Domain.
 */
class TradeController {
    
    async getWorkspaceOverview(req, res) {
        try {
            const userId = req.user.id;
            const storeId = req.headers['x-store-id'];
            
            const overview = await TradeWorkspaceService.getWorkspaceOverview(userId, storeId);
            return successResponse(res, overview, 'Workspace overview fetched successfully');
        } catch (error) {
            console.error('[TradeController] getWorkspaceOverview error:', error);
            return errorResponse(res, 500, 'Failed to fetch workspace overview');
        }
    }

    async getInbox(req, res) {
        try {
            const userId = req.user.id;
            const storeId = req.headers['x-store-id'];
            const filters = req.query; // page, limit, status
            
            const inbox = await TradeService.getInbox(userId, storeId, filters);
            return successResponse(res, inbox, 'Inbox fetched successfully');
        } catch (error) {
            console.error('[TradeController] getInbox error:', error);
            return errorResponse(res, 500, 'Failed to fetch inbox');
        }
    }

    async getOutbox(req, res) {
        try {
            const userId = req.user.id;
            const storeId = req.headers['x-store-id'];
            const filters = req.query;
            
            const outbox = await TradeService.getOutbox(userId, storeId, filters);
            return successResponse(res, outbox, 'Outbox fetched successfully');
        } catch (error) {
            console.error('[TradeController] getOutbox error:', error);
            return errorResponse(res, 500, 'Failed to fetch outbox');
        }
    }

    async createTrade(req, res) {
        try {
            const userId = req.user.id;
            const tradePayload = req.body;
            
            const trade = await TradeService.createTrade(userId, tradePayload);
            return successResponse(res, trade, 'Trade created successfully');
        } catch (error) {
            console.error('[TradeController] createTrade error:', error);
            return errorResponse(res, 400, error.message || 'Failed to create trade');
        }
    }

    async acceptTrade(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            
            const trade = await TradeService.acceptTrade(userId, id);
            return successResponse(res, trade, 'Trade accepted');
        } catch (error) {
            console.error('[TradeController] acceptTrade error:', error);
            return errorResponse(res, 400, error.message || 'Failed to accept trade');
        }
    }
}

export default new TradeController();
