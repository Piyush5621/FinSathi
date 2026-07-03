import express from 'express';
import MarketplaceController from '../../controllers/network/MarketplaceController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Listings
router.get('/listings', MarketplaceController.getListings);
router.post('/listings', MarketplaceController.createListing);

export default router;
