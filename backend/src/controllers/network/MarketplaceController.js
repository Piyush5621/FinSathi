import MarketplaceService from '../../services/network/MarketplaceService.js';
import { successResponse, errorResponse } from '../../utils/responseHelper.js';

/**
 * MarketplaceController
 * HTTP Layer for the Marketplace Domain.
 */
class MarketplaceController {
    
    async getListings(req, res) {
        try {
            const filters = req.query;
            const listings = await MarketplaceService.getListings(filters);
            return successResponse(res, listings, 'Listings fetched successfully');
        } catch (error) {
            console.error('[MarketplaceController] getListings error:', error);
            return errorResponse(res, 500, 'Failed to fetch listings');
        }
    }

    async createListing(req, res) {
        try {
            const userId = req.user.id;
            const listingData = req.body; 
            
            const listing = await MarketplaceService.createListing(userId, listingData);
            return successResponse(res, listing, 'Listing created successfully');
        } catch (error) {
            console.error('[MarketplaceController] createListing error:', error);
            return errorResponse(res, 400, error.message || 'Failed to create listing');
        }
    }
}

export default new MarketplaceController();
