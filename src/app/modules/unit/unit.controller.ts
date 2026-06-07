import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync'; // আপনার প্রজেক্টের পাথ অনুযায়ী ঠিক করে নিবেন
import sendResponse from '../../utils/sendResponse'; // আপনার প্রজেক্টের পাথ অনুযায়ী ঠিক করে নিবেন
import { UnitServices } from './unit.service';

// ১. ইউনিট তৈরি করা
const createUnit = catchAsync(async (req: Request, res: Response) => {
  const result = await UnitServices.createUnitIntoDB(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Unit created successfully!',
    data: result,
  });
});

// ২. সব ইউনিট গেট করা (পেজিনেশন সহ)
const getAllUnits = catchAsync(async (req: Request, res: Response) => {
  const result = await UnitServices.getAllUnitsFromDB(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Units retrieved successfully!',
    meta: result.meta,
    data: result.data,
  });
});

const getSingleUnit = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UnitServices.getSingleUnitFromDB(id as string);
  res.status(200).json({
    success: true,
    message: "Unit retrieved successfully!",
    data: result,
  });
});

// ৩. ইউনিট আপডেট করা
const updateUnit = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UnitServices.updateUnitInDB(id as string, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Unit updated successfully!',
    data: result,
  });
});

export const UnitControllers = {
  createUnit,
  getAllUnits,
  getSingleUnit,
  updateUnit,
};