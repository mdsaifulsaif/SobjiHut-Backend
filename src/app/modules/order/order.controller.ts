// order.controller.ts
import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { OrderServices } from "./order.service";

const createOrder = catchAsync(async (req: Request, res: Response) => {
  const userID = req.user._id as string;
  const result = await OrderServices.createOrderIntoDB(userID, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Order placed successfully!",
    data: result,
  });
});

const getMyOrders = catchAsync(async (req: Request, res: Response) => {
  const userID = req.user._id as string;
  const result = await OrderServices.getMyOrdersFromDB(userID, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Orders fetched successfully!",
    data: result,
  });
});

const getSingleOrder = catchAsync(async (req: Request, res: Response) => {
  const userID = req.user._id as string;
  const { id } = req.params as { id: string };

  const result = await OrderServices.getSingleOrderFromDB(id, userID);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order fetched successfully!",
    data: result,
  });
});

const cancelOrder = catchAsync(async (req: Request, res: Response) => {
  const userID = req.user._id as string;
  const { id } = req.params as { id: string };

  const result = await OrderServices.cancelOrderByUser(
    id,
    userID,
    req.body.reason as string,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order cancelled successfully!",
    data: result,
  });
});

const getAllOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderServices.getAllOrdersFromDB(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "All orders fetched!",
    data: result,
  });
});

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const adminID = req.user._id as string;
  const { id } = req.params as { id: string };

  const result = await OrderServices.updateOrderStatusByAdmin(
    id,
    req.body.status as string,
    req.body.note as string,
    adminID,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order status updated!",
    data: result,
  });
});

export const OrderControllers = {
  createOrder,
  getMyOrders,
  getSingleOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
};
