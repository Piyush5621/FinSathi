import express from 'express';
import { getCatalog, createOrder } from '../controllers/CatalogController.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public routes for digital catalog with rate limiting
router.get('/:businessSlug', getCatalog);
router.post('/:businessSlug/orders', generalLimiter, createOrder);

export default router;
