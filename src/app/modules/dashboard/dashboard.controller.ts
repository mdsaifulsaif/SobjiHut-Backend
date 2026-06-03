import { Request, Response } from "express";
import { AnalyticsService, getDashboardStatsFromDB } from "./dashboard.service";

export const AnalyticsController = {
  getDashboardStats: async (req: Request, res: Response) => {
    try {
      const data = await AnalyticsService.getDashboardStats();

      res.status(200).json({
        success: true,
        message: "Analytics data fetched successfully",
        data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch analytics",
      });
    }
  },
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    
    const { startDate, endDate } = req.query;

    const result = await getDashboardStatsFromDB(
      startDate as string,
      endDate as string,
    );

    res.status(200).json({
      success: true,
      message: "Analytics fetched successfully",
      data: {
        headerStats: [
          {
            label: "Total Revenue",
            value: `৳${result.revenue.value.toLocaleString()}`,
            growth: result.revenue.growth,
            icon: "revenue",
          },
          {
            label: "Total Orders",
            value: result.orders.value.toLocaleString(),
            growth: result.orders.growth,
            icon: "orders",
          },
          {
            label: "Total Customers",
            value: result.customers.value.toLocaleString(),
            growth: result.customers.growth,
            icon: "customers",
          },
          {
            label: "Avg. Order Value",
            value: `৳${result.avgOrderValue.value.toFixed(0)}`,
            growth: result.avgOrderValue.growth,
            icon: "avg",
          },
        ],

        middleStats: {
          pendingOrders: result.orderStatusCounts.pending,
          lowStockProducts: result.lowStockCount,
          orderSuccessRate: result.orderSuccessRate,
        },

        orderStatusBreakdown: [
          {
            label: "Delivered",
            count: result.orderStatusCounts.delivered,
            color: "text-green-500",
          },
          {
            label: "Shipped",
            count: result.orderStatusCounts.shipped,
            color: "text-blue-500",
          },
          {
            label: "Processing",
            count: result.orderStatusCounts.processing,
            color: "text-purple-500",
          },
          {
            label: "Pending",
            count: result.orderStatusCounts.pending,
            color: "text-orange-500",
          },
          {
            label: "Cancelled",
            count: result.orderStatusCounts.cancelled,
            color: "text-red-500",
          },
        ],

        revenueOverview: result.formattedRevenue,
        salesByCategory: result.salesByCategory,
        ordersByCity: result.ordersByCity,
        topProducts: result.topProducts.map((p: any) => ({
          name: p.info.name,
          sales: p.sales,
          amount: `৳${p.amount.toLocaleString()}`,
          image: p.info.thumbnail,
        })),

        recentOrders: result.recentOrders.map((order: any) => ({
          id: order._id,
          orderId:
            order.orderId || order._id.toString().slice(-6).toUpperCase(),
          customer: order.shippingAddress.name || "Guest User",
          amount: `৳${order.totalAmount.toLocaleString()}`,
          status: order.status,
          date: order.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("Dashboard Controller Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
