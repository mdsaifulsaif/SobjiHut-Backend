import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ReviewServices } from './review.service';



const createReview = catchAsync(async (req: Request, res: Response) => {

  const userId = (req as any).user?._id; 

  if (!userId) {
    throw new Error('User not authenticated!');
  }


  const reviewData = {
    ...req.body,
    userID: userId,
  };

 
  const result = await ReviewServices.addReviewToDB(reviewData);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Review added successfully!',
    data: result,
  });
});

const getReviews = catchAsync(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const result = await ReviewServices.getAllReviewsFromDB(page, limit);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Reviews retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getProductReviews = catchAsync(async (req: Request, res: Response) => {

 const productId: string = req.params.id as string;


  const page = Number(req.query.page as string) || 1;
  const limit = Number(req.query.limit as string) || 10;

  
  const result = await ReviewServices.getReviewsByProductIdFromDB(
    productId, 
    page, 
    limit
  );

 
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Product reviews retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const ReviewControllers = {
  createReview,
  getReviews,
  getProductReviews
};