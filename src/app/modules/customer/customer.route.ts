import express from 'express';
import { UserControllers } from './customer.controler';
import { isAdmin, isAuthenticated } from '../../middlewares/auth.middleware';


const router = express.Router();

// customer list 
router.get(
  '/',
  isAuthenticated,
  isAdmin,
  UserControllers.getAllCustomers
);

// customer block and active
router.patch(
  '/:id/status',
  isAuthenticated,
  isAdmin,
  UserControllers.toggleCustomerStatus
);

export const CustomerRoutes = router;