
import express from 'express';
import auth from '../../app/middlewares/auth';
import validateRequest from '../../app/middlewares/validateRequest';
import { WorkerControllers } from './worker.controller';
import { WorkerValidation } from './worker.validation';
import { AttendanceControllers } from '../Attendance/attendance.controller';
import { AttendanceValidation } from '../Attendance/attendance.validation';
import loginRateLimiter from '../../app/middlewares/loginRateLimiter';
import { LeavePayrollControllers } from './leavePayroll.controller';
import {
  createLeaveValidation,
  generatePayrollValidation,
  leaveIdValidation,
  reviewLeaveValidation,
  updatePayrollValidation,
} from './leavePayroll.validation';

const router = express.Router();

// Public worker login
router.post(
  '/login',
  loginRateLimiter,
  validateRequest(WorkerValidation.workerLoginValidationSchema),
  WorkerControllers.workerLogin,
);

// Worker dashboard — must come before /:id
router.get(
  '/dashboard',
  auth('WORKER'),
  WorkerControllers.getWorkerDashboard,
);
router.get(
  '/assigned-bookings',
  auth('WORKER'),
  WorkerControllers.getAssignedBookings,
);
router.get(
  '/cash-transactions',
  auth('WORKER'),
  validateRequest(WorkerValidation.cashTransactionListValidationSchema),
  WorkerControllers.getMyCashTransactions,
);
router.get(
  '/me',
  auth('WORKER'),
  WorkerControllers.getMyProfile,
);
router.patch(
  "/assigned-bookings/:id/work-action",
  auth("WORKER"),
  WorkerControllers.updateAssignedBookingWork,
);
router.post(
  '/assigned-bookings/:id/verify-vehicle',
  auth('WORKER'),
  validateRequest(WorkerValidation.verifyAssignedVehicleQrValidationSchema),
  WorkerControllers.verifyAssignedVehicleQr,
);
router.patch(
  '/assigned-bookings/:id/progress',
  auth('WORKER'),
  validateRequest(WorkerValidation.cleaningProgressValidationSchema),
  WorkerControllers.updateAssignedBookingProgress,
);

router.get('/attendance/me', auth('WORKER'), AttendanceControllers.getMyAttendance);
router.get(
  '/attendance/my-history',
  auth('WORKER'),
  AttendanceControllers.getMyAttendanceHistory,
);
router.post(
  '/attendance/punch-in',
  auth('WORKER'),
  validateRequest(AttendanceValidation.punchValidationSchema),
  AttendanceControllers.punchIn,
);
router.post(
  '/attendance/punch-out',
  auth('WORKER'),
  validateRequest(AttendanceValidation.punchValidationSchema),
  AttendanceControllers.punchOut,
);
router.get('/attendance', auth('admin'), AttendanceControllers.getDailyReport);
router.get('/leaves/mine', auth('WORKER'), LeavePayrollControllers.getLeaves);
router.post(
  '/leaves',
  auth('WORKER'),
  validateRequest(createLeaveValidation),
  LeavePayrollControllers.createLeave,
);
router.delete(
  '/leaves/:id',
  auth('WORKER'),
  validateRequest(leaveIdValidation),
  LeavePayrollControllers.cancelLeave,
);
router.get('/leaves', auth('admin'), LeavePayrollControllers.getLeaves);
router.patch(
  '/leaves/:id/review',
  auth('admin'),
  validateRequest(reviewLeaveValidation),
  LeavePayrollControllers.reviewLeave,
);
router.get('/payroll/mine', auth('WORKER'), LeavePayrollControllers.getPayroll);
router.get('/payroll', auth('admin'), LeavePayrollControllers.getPayroll);
router.post(
  '/payroll/generate',
  auth('admin'),
  validateRequest(generatePayrollValidation),
  LeavePayrollControllers.generatePayroll,
);
router.patch(
  '/payroll/:id',
  auth('admin'),
  validateRequest(updatePayrollValidation),
  LeavePayrollControllers.updatePayroll,
);

// Admin-only worker management
router.post(
  '/',
  auth('admin'),
  validateRequest(WorkerValidation.createWorkerValidationSchema),
  WorkerControllers.createWorker,
);

router.get('/', auth('admin'), WorkerControllers.getAllWorkers);

router.get('/stats', auth('admin'), WorkerControllers.getWorkerStats);

router.get('/:id', auth('admin'), WorkerControllers.getSingleWorker);

router.patch(
  '/:id',
  auth('admin'),
  validateRequest(WorkerValidation.updateWorkerValidationSchema),
  WorkerControllers.updateWorker,
);

router.delete('/:id', auth('admin'), WorkerControllers.deleteWorker);

 
export const workerRoutes = router;
