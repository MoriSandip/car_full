import express from 'express'; 
import { CustomerControllers } from './customer.controller';
import { CustomerValidation } from './customer.validation';
import validateRequest from '../../app/middlewares/validateRequest';
import auth from '../../app/middlewares/auth';
import loginRateLimiter from '../../app/middlewares/loginRateLimiter';

const router = express.Router();

// Public routes
router.post(
  '/',
  auth('admin'),
  validateRequest(CustomerValidation.registerCustomerValidationSchema),
  CustomerControllers.createCustomer,
);

router.post(
  '/register',
  loginRateLimiter,
  validateRequest(CustomerValidation.registerCustomerValidationSchema),
  CustomerControllers.registerCustomer,
);

router.post(
  '/login',
  loginRateLimiter,
  validateRequest(CustomerValidation.customerLoginValidationSchema),
  CustomerControllers.customerLogin,
);

// Protected route
router.get('/me', auth('CUSTOMER'), CustomerControllers.getMyProfile);

// Admin customer management
router.get('/', auth('admin'), CustomerControllers.getAllCustomers);
router.get('/:id', auth('admin'), CustomerControllers.getSingleCustomer);
router.patch(
  '/:id',
  auth('admin'),
  validateRequest(CustomerValidation.updateCustomerValidationSchema),
  CustomerControllers.updateCustomer,
);
router.delete('/:id', auth('admin'), CustomerControllers.deleteCustomer);

export const customerRoutes = router;