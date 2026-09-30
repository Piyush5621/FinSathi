import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import * as StaffController from '../controllers/StaffController.js';

const router = express.Router();

router.use(authenticateToken);

// Self-service profile routes (staff & owner)
router.get('/me/profile', StaffController.getMyProfile);
router.put('/me/profile', StaffController.updateMyProfile);
router.put('/me/password', StaffController.updateMyPassword);

// Attendance routes
router.get('/attendance', StaffController.getAttendance);
router.post('/attendance', StaffController.markAttendance);

// Staff management routes (owner/manager)
router.get('/', StaffController.getStaff);
router.post('/', StaffController.addStaff);
router.get('/:id', StaffController.getStaffById);
router.put('/:id', StaffController.updateStaff);
router.patch('/:id/status', StaffController.updateStaffStatus);
router.delete('/:id', StaffController.deleteStaff);

export default router;
