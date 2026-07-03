import express from 'express';
import PartnerController from '../../controllers/network/PartnerController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Connections
router.get('/', PartnerController.getConnections);
router.get('/pending', PartnerController.getPendingRequests);
router.post('/request', PartnerController.sendRequest);
router.put('/:connectionId/respond', PartnerController.respondRequest);

export default router;
