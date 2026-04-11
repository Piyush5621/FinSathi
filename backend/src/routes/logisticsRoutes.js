import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import * as LogisticsController from '../controllers/LogisticsController.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/warehouses', LogisticsController.getWarehouses);
router.post('/warehouses', LogisticsController.addWarehouse);
router.get('/suppliers', LogisticsController.getSuppliers);
router.post('/suppliers', LogisticsController.addSupplier);
router.get('/purchase-orders', LogisticsController.getPurchaseOrders);
router.post('/purchase-orders', LogisticsController.createPurchaseOrder);

export default router;
