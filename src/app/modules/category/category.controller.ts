import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { CategoryServices } from "./category.service";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { deleteFromCloudinary } from "../../utils/deleteFromCloudinary";
import { Category } from "./category.model"; 


const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryServices.createCategoryIntoDB(req.body, req.file);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Category created successfully!",
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params; // রাউট থেকে আইডি পাবো
  // req.body এবং req.file দুটোই পাঠাচ্ছি
  const result = await CategoryServices.updateCategoryIntoDB(id as string, req.body, req.file);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Category updated successfully!",
    data: result,
  });
});

const getSingleCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CategoryServices.getSingleCategoryFromDB(id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Category retrieved successfully!",
    data: result,
  });
});

const getCategories = catchAsync(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const result = await CategoryServices.getAllCategoriesFromDB(page, limit);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Categories retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const category = await Category.findById(id);

  if (!category || category.isDeleted) {
    throw new Error("Category not found!");
  }

  // Cloudinary থেকে ইমেজ ডিলিট করা
  if (category.imagePublicId) {
    await deleteFromCloudinary(category.imagePublicId);
  }

  await CategoryServices.deleteCategoryFromDB(id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Category deleted successfully!",
    data: null,
  });
});

const getCategoryByProducts = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const result = await CategoryServices.getProductsByCategoryFromDB(id as string, page, limit);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Products retrieved by category successfully!",
    meta: result.meta,
    data: result.data,
  });
});

export const CategoryControllers = {
  createCategory,
  updateCategory ,
  getSingleCategory,
  getCategories,
  deleteCategory,
  getCategoryByProducts,
};
