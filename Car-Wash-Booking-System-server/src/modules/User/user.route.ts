import express from 'express';
import { UserControllers } from './user.controller';
import auth from '../../app/middlewares/auth';
import validateRequest from '../../app/middlewares/validateRequest';
import { UserValidation } from './user.validation';

const router = express.Router();

router.get('/', auth('admin'), UserControllers.getAllUsers);
router.get('/:id', auth('admin'), UserControllers.getSingleUser);
router.patch(
  '/:id',
  auth('admin'),
  validateRequest(UserValidation.updateUserValidationSchema),
  UserControllers.updateSingleUser,
);

export const UserRoutes = router;
