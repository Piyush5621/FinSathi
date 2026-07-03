import express from 'express';
import ReputationController from '../../controllers/network/ReputationController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// User can request their own reputation or a partner's (if authorized)
router.get('/:userId?/score', ReputationController.getTrustScore);
router.get('/:userId?/metrics', ReputationController.getRawMetrics);
router.get('/:userId?/history', ReputationController.getHistory);

// Recalculate (usually triggered by background jobs, but exposed for testing/admin)
router.post('/recalculate', ReputationController.forceRecalculate);

export default router;
