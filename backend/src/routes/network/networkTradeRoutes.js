import express from 'express';
import TradeController from '../../controllers/network/TradeController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Trade Workspace Overview
router.get('/workspace', TradeController.getWorkspaceOverview);

// Inbox/Outbox
router.get('/inbox', TradeController.getInbox);
router.get('/outbox', TradeController.getOutbox);

// Trade Transactions
router.post('/', TradeController.createTrade);
router.put('/:id/accept', TradeController.acceptTrade);

export default router;
