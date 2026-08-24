import express from 'express';
import TradeController from '../../controllers/network/TradeController.js';
import {
  sendTradeTransaction,
  sendSaleTradeTransaction,
  getPurchaseInbox,
  getSalesOutbox,
  getTransactionDetail,
  updateTransactionStatus,
  getTradeHistory
} from '../../controllers/TradeController.js';
import {
  getCreditAccounts,
  createOrUpdateCreditAccount,
  updateCreditOutstanding
} from '../../controllers/TradeCreditController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Trade Workspace Overview
router.get('/workspace', TradeController.getWorkspaceOverview);

// Inbox/Outbox/History
router.get('/inbox', getPurchaseInbox);
router.get('/outbox', getSalesOutbox);
router.get('/history', getTradeHistory);

// Trade Credits
router.get('/credit', getCreditAccounts);
router.post('/credit', createOrUpdateCreditAccount);
router.put('/credit/:id', updateCreditOutstanding);

// Trade Transactions & Status
router.post('/send', sendTradeTransaction);
router.post('/send-sale', sendSaleTradeTransaction);
router.post('/', TradeController.createTrade);
router.put('/:id/accept', TradeController.acceptTrade);
router.get('/:id', getTransactionDetail);
router.put('/:id/status', updateTransactionStatus);

export default router;
