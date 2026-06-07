// order.route.ts
import { Router } from "express";
import { OrderControllers } from "./order.controller";
import { isAuthenticated, isAdmin } from "../../middlewares/auth.middleware";

const router = Router();

// User routes
router.post("/place-order", isAuthenticated, OrderControllers.createOrder);
router.get("/my-orders", isAuthenticated, OrderControllers.getMyOrders);
router.get("/my-orders/:id", isAuthenticated, OrderControllers.getSingleOrder);
router.patch("/cancel/:id", isAuthenticated, OrderControllers.cancelOrder);

// Admin routes
router.get(
  "/admin/all",
  isAuthenticated,
  isAdmin,
  OrderControllers.getAllOrders,
);
router.patch(
  "/admin/status/:id",
  isAuthenticated,
  isAdmin,
  OrderControllers.updateOrderStatus,
);

export const OrderRoutes = router;
