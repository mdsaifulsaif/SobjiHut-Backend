import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SubscriberServices } from './subscriber.service';

const subscribeEmail = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriberServices.addSubscriberToDB(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Subscribed successfully!',
    data: result,
  });
});

const getSubscribers = catchAsync(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  
  const result = await SubscriberServices.getAllSubscribersFromDB(page, limit);

 
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Subscribers list retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const SubscriberControllers = {
  subscribeEmail,
  getSubscribers,
};