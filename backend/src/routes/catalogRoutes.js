import express from 'express';
import { getCatalog, createOrder } from '../controllers/CatalogController.js';

const router = express.Router();

// Public routes for digital catalog
router.get('/:businessSlug', getCatalog);
router.post('/:businessSlug/orders', createOrder);

export default router;
