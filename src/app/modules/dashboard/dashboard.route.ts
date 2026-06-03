import express from "express";
import { AnalyticsController, getDashboardStats } from "./dashboard.controller";
import { isAdmin, isAuthenticated } from "../../middlewares/auth.middleware";

const router = express.Router();

// GET: /api/v1/analytics/dashboard
router.get("/analytics", AnalyticsController.getDashboardStats);


router.get("/admin-overview", isAuthenticated, isAdmin, getDashboardStats);



export const DashboardRoutes = router;