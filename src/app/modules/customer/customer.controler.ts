import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { UserServices } from "./csutomer.service";

const getAllCustomers = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.getAllCustomersFromDB(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Customers retrieved successfully",
    meta: result.meta,
    data: {
      stats: result.stats,
      customers: result.data,
    },
  });
});

const toggleCustomerStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const result = await UserServices.updateCustomerStatusInDB(
    id as string,
    status,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Customer status changed to ${status}`,
    data: result,
  });
});

export const UserControllers = {
  getAllCustomers,
  toggleCustomerStatus,
};
