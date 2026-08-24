import express from 'express';
import { getCatalog, createOrder } from '../controllers/CatalogController.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public routes for digital catalog with rate limiting
router.get('/:businessSlug', (req, res, next) => {
  // Pass through system endpoints
  if (req.params.businessSlug === 'products' || req.params.businessSlug === 'health') {
    return next();
  }
  getCatalog(req, res, next);
});
router.post('/:businessSlug/orders', generalLimiter, createOrder);

export default router;
