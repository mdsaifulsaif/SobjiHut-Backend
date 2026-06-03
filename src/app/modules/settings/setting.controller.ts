import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { Setting } from "./setting.model";
import { SettingServices } from "./setting.service";

// Get Settings
const getSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await Setting.findOne();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Settings retrieved successfully!",
    data: result || {},
  });
});

// Update/Create Settings

const updateSettings = catchAsync(async (req: Request, res: Response) => {
  

  
  const result = await SettingServices.updateSettingsIntoDB(
    req.body,
    req.files,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Settings updated successfully!",
    data: result,
  });
});
export const SettingControllers = {
  getSettings,
  updateSettings,
};
