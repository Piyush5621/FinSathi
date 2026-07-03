import express from 'express';
import AIController from '../../controllers/network/AIController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Expose AI capabilities
router.post('/copilot/ask', AIController.askCopilot);

export default router;
