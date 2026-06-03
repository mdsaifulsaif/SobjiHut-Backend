import express from 'express';
import { OrderControllers } from './order.controller';
import { isAuthenticated, isAdmin } from '../../middlewares/auth.middleware'; 

const router = express.Router();

// user route
router.post('/create', isAuthenticated, OrderControllers.createOrder);
router.get('/my-orders', isAuthenticated, OrderControllers.getMyOrders);
router.get('/my-orders/:orderId', isAuthenticated, OrderControllers.getSingleOrder);

// admin route
router.get("/admin-stats", isAuthenticated, isAdmin, OrderControllers.getDashboardStats);
router.patch('/:orderId/status', isAuthenticated, isAdmin, OrderControllers.updateOrderStatus);
router.get('/all-orders', isAuthenticated, isAdmin, OrderControllers.getAllOrders); 
router.get('/:orderId', isAuthenticated, isAdmin, OrderControllers.getAdminSingleOrder);


export const OrderRoutes = router;