import express from 'express';
import GrowthController from '../../controllers/network/GrowthController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Business Growth Insights & Recommendations
router.get('/recommendations', GrowthController.getRecommendations);
router.get('/schemes', GrowthController.getSchemes);
router.get('/funding', GrowthController.getFunding);
router.get('/milestones', GrowthController.getMilestones);

export default router;
