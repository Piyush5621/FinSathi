import express from 'express';
import { getMatchedSchemes, dismissScheme } from '../controllers/SchemeController.js';

const router = express.Router();

router.get('/matched', getMatchedSchemes);
router.post('/dismiss/:schemeId', dismissScheme);

export default router;
