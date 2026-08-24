import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import * as StaffController from '../controllers/StaffController.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/me/profile', StaffController.getMyProfile);

router.get('/', StaffController.getStaff);
router.post('/', StaffController.addStaff);
router.get('/:id', StaffController.getStaffById);
router.put('/:id', StaffController.updateStaff);
router.patch('/:id/status', StaffController.updateStaffStatus);
router.delete('/:id', StaffController.deleteStaff);

router.get('/attendance', StaffController.getAttendance);
router.post('/attendance', StaffController.markAttendance);
router.get('/payroll', StaffController.getPayroll);
router.post('/payroll', StaffController.processPayment);
router.delete('/payroll/:id', StaffController.deletePayroll);

export default router;
