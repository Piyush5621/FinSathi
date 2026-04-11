import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import * as StaffController from '../controllers/StaffController.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', StaffController.getStaff);
router.post('/', StaffController.addStaff);
router.get('/attendance', StaffController.getAttendance);
router.post('/attendance', StaffController.markAttendance);
router.get('/payroll', StaffController.getPayroll);
router.post('/payroll', StaffController.processPayment);
router.delete('/payroll/:id', StaffController.deletePayroll);

export default router;
