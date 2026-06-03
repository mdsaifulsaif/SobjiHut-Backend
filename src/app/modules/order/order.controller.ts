import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { OrderServices } from "./order.service";

// const createOrder = catchAsync(async (req: Request, res: Response) => {
//   const userId = (req as any).user?._id;
//   const result = await OrderServices.createOrderIntoDB({ ...req.body, user: userId });

//   sendResponse(res, {
//     statusCode: 201,
//     success: true,
//     message: "Order placed successfully!",
//     data: result,
//   });
// });

const createOrder = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?._id;
 
  const result = await OrderServices.createOrderIntoDB({
    ...req.body,
    user: userId,
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Order placed successfully!",
    data: result,
  });
});

const getMyOrders = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?._id;
  const result = await OrderServices.getMyOrdersFromDB(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Orders retrieved successfully!",
    data: result,
  });
});

// const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
//   const { orderId } = req.params;
//   const { status } = req.body;
//   const result = await OrderServices.updateOrderStatusInDB(orderId as string, status);

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: `Order marked as ${status}`,
//     data: result,
//   });
// });

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const result = await OrderServices.updateOrderStatusInDB(
    orderId as string,
    status,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Order marked as ${status}`,
    data: result,
  });
});

const getSingleOrder = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?._id;
  const { orderId } = req.params;
  const result = await OrderServices.getSingleOrderFromDB(
    orderId as string,
    userId,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order details retrieved successfully!",
    data: result,
  });
});

const getAllOrders = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, search } = req.query;

  const result = await OrderServices.getAllOrdersFromDB(
    Number(page) || 1,
    Number(limit) || 10,
    search as string,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "All orders retrieved successfully!",
    meta: {
      page: result.pagination.currentPage,
      limit: Number(limit) || 10,
      total: result.pagination.totalOrders,
      totalPage: result.pagination.totalPages,
    },
    data: {
      orders: result.orders,
      stats: result.stats,
    },
  });
});

const getAdminSingleOrder = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const result = await OrderServices.getAdminSingleOrderFromDB(
    orderId as string,
  );

  if (!result) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: "Order not found!",
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order details fetched for admin successfully!",
    data: result,
  });
});

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const result = await OrderServices.getDashboardStatsFromDB();

    res.status(200).json({
      success: true,
      message: "Dashboard data retrieved successfully",
      data: {
        stats: [
          {
            title: "Total Revenue",
            value: `$${result.revenue.toLocaleString()}`,
            icon: "wallet",
          },
          {
            title: "Orders",
            value: result.ordersCount.toString(),
            icon: "cart",
          },
          {
            title: "Customers",
            value: result.customersCount.toString(),
            icon: "people",
          },
          {
            title: "Avg. Order Value",
            value: `$${result.avgOrderValue.toFixed(2)}`,
            icon: "stats",
          },
        ],
        charts: {
          salesOverview: result.formattedSales,
        },
        recentOrders: result.recentOrders,
        topProducts: result.topProducts,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const OrderControllers = {
  createOrder,
  getMyOrders,
  updateOrderStatus,
  getSingleOrder,
  getAllOrders,
  getAdminSingleOrder,
  getDashboardStats,
};
