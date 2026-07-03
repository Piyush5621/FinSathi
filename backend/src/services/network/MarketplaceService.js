import MarketplaceRepository from '../../repositories/network/MarketplaceRepository.js';
import EventBus from '../../utils/EventBus.js';

/**
 * MarketplaceService
 * Business Logic Layer for the Marketplace Domain.
 */
class MarketplaceService {
    
    async getListings(filters) {
        return await MarketplaceRepository.getListings(filters);
    }

    async createListing(userId, listingData) {
        // Validation of listingData could happen here, or in Zod at Controller level.
        // We ensure a default expiry of 30 days if not provided
        if (!listingData.expires_at) {
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 30);
            listingData.expires_at = expiry.toISOString();
        }

        const listing = await MarketplaceRepository.createListing(userId, listingData);
        
        EventBus.publish('ListingCreated', {
            userId,
            listingId: listing.id,
            listingType: listing.listing_type,
            timestamp: new Date()
        });

        return listing;
    }

    async expireListing(listingId) {
        const updated = await MarketplaceRepository.updateListingStatus(listingId, 'EXPIRED');
        
        EventBus.publish('ListingExpired', {
            listingId,
            userId: updated.user_id,
            timestamp: new Date()
        });
        
        return updated;
    }
}

export default new MarketplaceService();
