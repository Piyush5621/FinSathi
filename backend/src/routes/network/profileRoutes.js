import express from 'express';
import ProfileController from '../../controllers/network/ProfileController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { validateRequest as validate } from '../../middleware/validateRequest.js';
import { updateProfileSchema } from '../../utils/schemas.js';

const router = express.Router();

router.use(authenticateToken);

// Get my business network profile
router.get('/me', ProfileController.getMyProfile);

// Update my business network profile
router.put('/me', validate(updateProfileSchema), ProfileController.updateMyProfile);

// Search business profiles (Directory)
router.get('/search', ProfileController.searchProfiles);

export default router;
